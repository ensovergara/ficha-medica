import uuid
import datetime as dt

from pydantic import BaseModel, Field

from app.models.appointment import AppointmentSource, AppointmentStatus


class AppointmentCreate(BaseModel):
    patient_id: uuid.UUID
    client_id: uuid.UUID
    veterinarian_id: uuid.UUID
    service_id: uuid.UUID | None = None
    date: dt.date
    start_time: dt.time
    end_time: dt.time | None = None
    reason: str | None = None
    notes: str | None = None


class AppointmentUpdate(BaseModel):
    date: dt.date | None = None
    start_time: dt.time | None = None
    end_time: dt.time | None = None
    status: AppointmentStatus | None = None
    service_id: uuid.UUID | None = None
    reason: str | None = None
    notes: str | None = None


class AppointmentResponse(BaseModel):
    id: uuid.UUID
    tenant_id: uuid.UUID
    patient_id: uuid.UUID
    client_id: uuid.UUID
    veterinarian_id: uuid.UUID
    service_id: uuid.UUID | None
    date: dt.date
    start_time: dt.time
    end_time: dt.time | None
    status: AppointmentStatus
    source: AppointmentSource
    reason: str | None
    notes: str | None
    guest_name: str | None
    guest_phone: str | None
    created_at: dt.datetime

    model_config = {"from_attributes": True}
