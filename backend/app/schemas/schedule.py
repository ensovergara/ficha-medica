import uuid
import datetime as dt
from typing import Literal

from pydantic import BaseModel, Field, model_validator


class VeterinarianScheduleCreate(BaseModel):
    veterinarian_id: uuid.UUID
    day_of_week: int = Field(..., ge=0, le=6, description="0=Lunes, 6=Domingo")
    start_time: dt.time
    end_time: dt.time
    is_active: bool = True

    @model_validator(mode="after")
    def validate_times(self):
        if self.start_time >= self.end_time:
            raise ValueError("start_time debe ser anterior a end_time")
        return self


class VeterinarianScheduleUpdate(BaseModel):
    day_of_week: int | None = Field(None, ge=0, le=6)
    start_time: dt.time | None = None
    end_time: dt.time | None = None
    is_active: bool | None = None


class VeterinarianScheduleResponse(BaseModel):
    id: uuid.UUID
    tenant_id: uuid.UUID
    veterinarian_id: uuid.UUID
    day_of_week: int
    start_time: dt.time
    end_time: dt.time
    is_active: bool

    model_config = {"from_attributes": True}


class ScheduleExceptionCreate(BaseModel):
    veterinarian_id: uuid.UUID
    exception_date: dt.date
    start_time: dt.time | None = None
    end_time: dt.time | None = None
    reason: str | None = Field(None, max_length=200)

    @model_validator(mode="after")
    def validate_times(self):
        if self.start_time and self.end_time:
            if self.start_time >= self.end_time:
                raise ValueError("start_time debe ser anterior a end_time")
        elif bool(self.start_time) != bool(self.end_time):
            raise ValueError("Proporciona start_time y end_time juntos, o ninguno (día completo)")
        return self


class ScheduleExceptionUpdate(BaseModel):
    start_time: dt.time | None = None
    end_time: dt.time | None = None
    reason: str | None = Field(None, max_length=200)


class ScheduleExceptionResponse(BaseModel):
    id: uuid.UUID
    tenant_id: uuid.UUID
    veterinarian_id: uuid.UUID
    exception_date: dt.date
    start_time: dt.time | None
    end_time: dt.time | None
    reason: str | None

    model_config = {"from_attributes": True}


class AvailableSlot(BaseModel):
    start_time: dt.time
    end_time: dt.time
