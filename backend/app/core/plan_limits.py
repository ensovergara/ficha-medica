import uuid

from fastapi import HTTPException, status
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.patient import Patient
from app.models.subscription import Plan, Subscription, SubscriptionStatus
from app.models.user import User


async def check_patient_limit(db: AsyncSession, tenant_id: uuid.UUID) -> None:
    """Raise 403 if tenant has reached their plan's patient limit."""
    sub_r = await db.execute(select(Subscription).where(Subscription.tenant_id == tenant_id))
    sub = sub_r.scalar_one_or_none()
    if not sub or sub.status == SubscriptionStatus.CANCELLED:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Sin suscripción activa")

    plan_r = await db.execute(select(Plan).where(Plan.id == sub.plan_id))
    plan = plan_r.scalar_one_or_none()
    if not plan or plan.max_patients is None:
        return  # unlimited

    count_r = await db.execute(select(func.count(Patient.id)).where(Patient.tenant_id == tenant_id, Patient.is_active == True))
    count = count_r.scalar() or 0

    if count >= plan.max_patients:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=f"Has alcanzado el límite de {plan.max_patients} pacientes de tu plan {plan.name}. Actualiza tu suscripción.",
        )


async def check_user_limit(db: AsyncSession, tenant_id: uuid.UUID) -> None:
    """Raise 403 if tenant has reached their plan's user limit."""
    sub_r = await db.execute(select(Subscription).where(Subscription.tenant_id == tenant_id))
    sub = sub_r.scalar_one_or_none()
    if not sub or sub.status == SubscriptionStatus.CANCELLED:
        return

    plan_r = await db.execute(select(Plan).where(Plan.id == sub.plan_id))
    plan = plan_r.scalar_one_or_none()
    if not plan or plan.max_users is None:
        return

    count_r = await db.execute(select(func.count(User.id)).where(User.tenant_id == tenant_id, User.is_active == True))
    count = count_r.scalar() or 0

    if count >= plan.max_users:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=f"Has alcanzado el límite de {plan.max_users} usuarios de tu plan {plan.name}.",
        )
