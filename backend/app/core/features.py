import uuid

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.feature import FeaturePlan
from app.models.subscription import Subscription


async def has_feature(
    db: AsyncSession, tenant_id: uuid.UUID, feature_key: str
) -> bool:
    """Check if a tenant has access to a specific feature based on their plan."""
    result = await db.execute(
        select(Subscription).where(Subscription.tenant_id == tenant_id)
    )
    subscription = result.scalar_one_or_none()

    if not subscription:
        return False

    result = await db.execute(
        select(FeaturePlan)
        .join(FeaturePlan.feature)
        .where(
            FeaturePlan.plan_id == subscription.plan_id,
        )
    )
    feature_plans = result.scalars().all()

    return any(fp.feature.key == feature_key for fp in feature_plans)
