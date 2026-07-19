import uuid
from datetime import datetime

from pydantic import BaseModel


class FeatureResponse(BaseModel):
    id: uuid.UUID
    key: str
    name: str
    description: str | None
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class FeaturePlanResponse(BaseModel):
    id: uuid.UUID
    plan_id: uuid.UUID
    feature_id: uuid.UUID
    feature: FeatureResponse
    created_at: datetime

    model_config = {"from_attributes": True}


class FeatureAssignmentResponse(BaseModel):
    id: uuid.UUID
    plan_id: uuid.UUID
    feature_id: uuid.UUID
    assigned_by: uuid.UUID | None
    created_at: datetime

    model_config = {"from_attributes": True}


class PlanFeaturesResponse(BaseModel):
    plan_id: uuid.UUID
    features: list[FeatureResponse]

    model_config = {"from_attributes": True}
