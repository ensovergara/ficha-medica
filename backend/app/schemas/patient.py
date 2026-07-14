import uuid
import datetime as dt

from pydantic import BaseModel


class PatientCreate(BaseModel):
    client_id: uuid.UUID
    name: str
    species: str
    breed: str | None = None
    birth_date: dt.date | None = None
    sex: str | None = None
    weight: float | None = None
    microchip: str | None = None
    photo_url: str | None = None


class PatientUpdate(BaseModel):
    name: str | None = None
    species: str | None = None
    breed: str | None = None
    birth_date: dt.date | None = None
    sex: str | None = None
    weight: float | None = None
    microchip: str | None = None
    photo_url: str | None = None
    is_active: bool | None = None


class PatientResponse(BaseModel):
    id: uuid.UUID
    tenant_id: uuid.UUID
    client_id: uuid.UUID
    name: str
    species: str
    breed: str | None
    birth_date: dt.date | None
    sex: str | None
    weight: float | None
    microchip: str | None
    photo_url: str | None
    is_active: bool
    created_at: dt.datetime

    model_config = {"from_attributes": True}
