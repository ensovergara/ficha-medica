import uuid
import datetime as dt

from pydantic import BaseModel, Field


class ServiceCreate(BaseModel):
    name: str = Field(..., max_length=100)
    description: str | None = None
    duration_minutes: int = Field(30, ge=5, le=480)
    price: float | None = None
    is_active: bool = True


class ServiceUpdate(BaseModel):
    name: str | None = Field(None, max_length=100)
    description: str | None = None
    duration_minutes: int | None = Field(None, ge=5, le=480)
    price: float | None = None
    is_active: bool | None = None


class ServiceResponse(BaseModel):
    id: uuid.UUID
    tenant_id: uuid.UUID
    name: str
    description: str | None
    duration_minutes: int
    price: float | None
    is_active: bool
    created_at: dt.datetime

    model_config = {"from_attributes": True}


class VeterinarianServiceAssign(BaseModel):
    veterinarian_id: uuid.UUID


class VeterinarianServiceResponse(BaseModel):
    id: uuid.UUID
    veterinarian_id: uuid.UUID
    service_id: uuid.UUID

    model_config = {"from_attributes": True}
