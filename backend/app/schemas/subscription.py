import uuid
from datetime import datetime

from pydantic import BaseModel

from app.models.subscription import SubscriptionStatus


class PlanCreate(BaseModel):
    name: str
    max_users: int = 1
    max_patients: int | None = None
    features: dict | None = None
    price_monthly: float = 0
    price_yearly: float = 0


class PlanResponse(BaseModel):
    id: uuid.UUID
    name: str
    max_users: int
    max_patients: int | None
    features: dict | None
    price_monthly: float
    price_yearly: float
    is_active: bool
    created_at: datetime

    model_config = {"from_attributes": True}


class SubscriptionResponse(BaseModel):
    id: uuid.UUID
    tenant_id: uuid.UUID
    plan_id: uuid.UUID
    status: SubscriptionStatus
    current_period_start: datetime | None
    current_period_end: datetime | None
    created_at: datetime

    model_config = {"from_attributes": True}
