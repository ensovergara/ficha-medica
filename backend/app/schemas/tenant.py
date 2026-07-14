import uuid
from datetime import datetime

from pydantic import BaseModel


class TenantCreate(BaseModel):
    name: str
    slug: str
    logo_url: str | None = None
    phone: str | None = None
    email: str | None = None
    address: str | None = None


class TenantUpdate(BaseModel):
    name: str | None = None
    logo_url: str | None = None
    phone: str | None = None
    email: str | None = None
    address: str | None = None
    is_active: bool | None = None


class TenantResponse(BaseModel):
    id: uuid.UUID
    name: str
    slug: str
    logo_url: str | None
    phone: str | None
    email: str | None
    address: str | None
    is_active: bool
    created_at: datetime

    model_config = {"from_attributes": True}
