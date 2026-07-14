import uuid
from datetime import datetime

from pydantic import BaseModel


class ClientCreate(BaseModel):
    rut: str | None = None
    first_name: str
    last_name: str
    phone: str | None = None
    email: str | None = None
    address: str | None = None


class ClientUpdate(BaseModel):
    rut: str | None = None
    first_name: str | None = None
    last_name: str | None = None
    phone: str | None = None
    email: str | None = None
    address: str | None = None


class ClientResponse(BaseModel):
    id: uuid.UUID
    tenant_id: uuid.UUID
    rut: str | None
    first_name: str
    last_name: str
    phone: str | None
    email: str | None
    address: str | None
    created_at: datetime

    model_config = {"from_attributes": True}
