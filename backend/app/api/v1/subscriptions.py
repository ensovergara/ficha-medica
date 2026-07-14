import uuid
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.dependencies import get_current_user, require_role_dep
from app.models.subscription import Plan, Subscription, SubscriptionStatus
from app.models.user import User, UserRole
from app.schemas.subscription import PlanCreate, PlanResponse, SubscriptionResponse


class SubscriptionUpdate(BaseModel):
    status: Optional[SubscriptionStatus] = None
    plan_id: Optional[uuid.UUID] = None

router = APIRouter(prefix="/subscriptions", tags=["Subscriptions"])


@router.get("/plans/", response_model=list[PlanResponse])
async def list_plans(db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Plan).where(Plan.is_active == True).order_by(Plan.price_monthly))
    return result.scalars().all()


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
