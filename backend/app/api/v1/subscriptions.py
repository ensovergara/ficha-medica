import uuid
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.dependencies import get_current_user, require_role_dep
from app.models.feature import Feature, FeatureAssignment, FeaturePlan, FeatureKey
from app.models.subscription import Plan, Subscription, SubscriptionStatus
from app.models.user import User, UserRole
from app.schemas.feature import FeaturePlanResponse, PlanFeaturesResponse
from app.schemas.subscription import PlanCreate, PlanResponse, SubscriptionResponse


class SubscriptionUpdate(BaseModel):
    status: Optional[SubscriptionStatus] = None
    plan_id: Optional[uuid.UUID] = None

router = APIRouter(prefix="/subscriptions", tags=["Subscriptions"])


@router.get("/plans/", response_model=list[PlanResponse])
async def list_plans(db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Plan).where(Plan.is_active == True).order_by(Plan.price_monthly))
    return result.scalars().all()


@router.get("/features/", response_model=list)
async def list_all_features(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_role_dep([UserRole.SUPERADMIN])),
):
    """Get all available features for assignment."""
    result = await db.execute(select(Feature).order_by(Feature.name))
    features = result.scalars().all()
    return [{"id": f.id, "key": f.key, "name": f.name, "description": f.description} for f in features]


@router.post("/plans/", response_model=PlanResponse, status_code=status.HTTP_201_CREATED)
async def create_plan(
    data: PlanCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_role_dep([UserRole.SUPERADMIN])),
):
    plan = Plan(**data.model_dump())
    db.add(plan)
    await db.flush()
    await db.refresh(plan)
    return plan


@router.get("/my-subscription/", response_model=SubscriptionResponse)
async def get_my_subscription(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if not current_user.tenant_id:
        raise HTTPException(status_code=400, detail="Sin tenant asignado")

    result = await db.execute(
        select(Subscription).where(Subscription.tenant_id == current_user.tenant_id)
    )
    subscription = result.scalar_one_or_none()
    if not subscription:
        raise HTTPException(status_code=404, detail="Sin suscripción activa")
    return subscription


@router.get("/my-subscription/has-feature/{feature_key}")
async def check_feature_access(
    feature_key: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Check if the current tenant has access to a specific feature."""
    if not current_user.tenant_id:
        raise HTTPException(status_code=400, detail="Sin tenant asignado")

    result = await db.execute(
        select(Subscription).where(Subscription.tenant_id == current_user.tenant_id)
    )
    subscription = result.scalar_one_or_none()
    if not subscription:
        raise HTTPException(status_code=404, detail="Sin suscripción activa")

    result = await db.execute(
        select(FeaturePlan)
        .join(FeaturePlan.feature)
        .where(FeaturePlan.plan_id == subscription.plan_id)
    )
    feature_plans = result.scalars().all()

    has_access = any(fp.feature.key == feature_key for fp in feature_plans)
    return {"feature_key": feature_key, "has_access": has_access}


@router.get("/", response_model=list[SubscriptionResponse])
async def list_subscriptions(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_role_dep([UserRole.SUPERADMIN])),
):
    result = await db.execute(select(Subscription).order_by(Subscription.created_at.desc()))
    return result.scalars().all()


@router.patch("/{subscription_id}", response_model=SubscriptionResponse)
async def update_subscription(
    subscription_id: uuid.UUID,
    data: SubscriptionUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_role_dep([UserRole.SUPERADMIN])),
):
    result = await db.execute(select(Subscription).where(Subscription.id == subscription_id))
    sub = result.scalar_one_or_none()
    if not sub:
        raise HTTPException(status_code=404, detail="Suscripción no encontrada")
    for field, value in data.model_dump(exclude_unset=True).items():
        setattr(sub, field, value)
    await db.flush()
    await db.refresh(sub)
    return sub


@router.get("/plans/{plan_id}/features", response_model=PlanFeaturesResponse)
async def get_plan_features(
    plan_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_role_dep([UserRole.SUPERADMIN])),
):
    result = await db.execute(select(Plan).where(Plan.id == plan_id))
    plan = result.scalar_one_or_none()
    if not plan:
        raise HTTPException(status_code=404, detail="Plan no encontrado")

    result = await db.execute(
        select(Feature)
        .join(FeaturePlan)
        .where(FeaturePlan.plan_id == plan_id)
    )
    features = result.scalars().all()

    return PlanFeaturesResponse(
        plan_id=plan_id,
        features=features,
    )


@router.post("/plans/{plan_id}/features/{feature_key}", status_code=status.HTTP_201_CREATED)
async def assign_feature_to_plan(
    plan_id: uuid.UUID,
    feature_key: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_role_dep([UserRole.SUPERADMIN])),
):
    result = await db.execute(select(Plan).where(Plan.id == plan_id))
    plan = result.scalar_one_or_none()
    if not plan:
        raise HTTPException(status_code=404, detail="Plan no encontrado")

    result = await db.execute(select(Feature).where(Feature.key == feature_key))
    feature = result.scalar_one_or_none()
    if not feature:
        raise HTTPException(status_code=404, detail="Feature no encontrado")

    result = await db.execute(
        select(FeaturePlan).where(
            FeaturePlan.plan_id == plan_id, FeaturePlan.feature_id == feature.id
        )
    )
    existing = result.scalar_one_or_none()
    if existing:
        raise HTTPException(status_code=400, detail="Feature ya asignado al plan")

    feature_plan = FeaturePlan(plan_id=plan_id, feature_id=feature.id)
    db.add(feature_plan)
    await db.flush()

    assignment = FeatureAssignment(
        plan_id=plan_id, feature_id=feature.id, assigned_by=current_user.id
    )
    db.add(assignment)
    await db.flush()
    await db.commit()

    return {"id": str(feature_plan.id), "plan_id": str(plan_id), "feature_id": str(feature.id)}


@router.delete("/plans/{plan_id}/features/{feature_key}", status_code=status.HTTP_204_NO_CONTENT)
async def remove_feature_from_plan(
    plan_id: uuid.UUID,
    feature_key: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_role_dep([UserRole.SUPERADMIN])),
):
    result = await db.execute(select(Plan).where(Plan.id == plan_id))
    plan = result.scalar_one_or_none()
    if not plan:
        raise HTTPException(status_code=404, detail="Plan no encontrado")

    result = await db.execute(select(Feature).where(Feature.key == feature_key))
    feature = result.scalar_one_or_none()
    if not feature:
        raise HTTPException(status_code=404, detail="Feature no encontrado")

    result = await db.execute(
        select(FeaturePlan).where(
            FeaturePlan.plan_id == plan_id, FeaturePlan.feature_id == feature.id
        )
    )
    feature_plan = result.scalar_one_or_none()
    if not feature_plan:
        raise HTTPException(status_code=404, detail="Feature no asignado a este plan")

    await db.delete(feature_plan)

    assignment = FeatureAssignment(
        plan_id=plan_id, feature_id=feature.id, assigned_by=current_user.id
    )
    db.add(assignment)

    await db.flush()


@router.get("/plans/{plan_id}/features/audit-log")
async def get_feature_audit_log(
    plan_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_role_dep([UserRole.SUPERADMIN])),
):
    """Get audit log of feature assignment changes for a plan."""
    result = await db.execute(select(Plan).where(Plan.id == plan_id))
    plan = result.scalar_one_or_none()
    if not plan:
        raise HTTPException(status_code=404, detail="Plan no encontrado")

    result = await db.execute(
        select(FeatureAssignment)
        .join(FeatureAssignment.feature)
        .where(FeatureAssignment.plan_id == plan_id)
        .order_by(FeatureAssignment.created_at.desc())
    )
    assignments = result.scalars().all()

    return [
        {
            "id": a.id,
            "plan_id": a.plan_id,
            "feature_key": a.feature.key,
            "feature_name": a.feature.name,
            "assigned_by": a.assigned_by,
            "created_at": a.created_at,
        }
        for a in assignments
    ]
