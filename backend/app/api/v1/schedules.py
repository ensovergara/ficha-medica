import uuid
from datetime import date, timedelta

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import and_, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.dependencies import get_tenant_id, require_permission_dep, tenant_filter
from app.models.schedule import ScheduleException, VeterinarianSchedule
from app.models.service import Service
from app.models.appointment import Appointment, AppointmentStatus
from app.models.user import User
from app.schemas.schedule import (
    AvailableSlot,
    ScheduleExceptionCreate,
    ScheduleExceptionResponse,
    ScheduleExceptionUpdate,
    VeterinarianScheduleCreate,
    VeterinarianScheduleResponse,
    VeterinarianScheduleUpdate,
)
from app.core.availability import compute_available_slots

router = APIRouter(prefix="/schedules", tags=["Schedules"])


# ─── Horarios semanales ───────────────────────────────────────────────────────

@router.get("/", response_model=list[VeterinarianScheduleResponse])
async def list_schedules(
    veterinarian_id: uuid.UUID | None = Query(None),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_permission_dep("appointments:read")),
    tenant_id: uuid.UUID = Depends(get_tenant_id),
):
    query = select(VeterinarianSchedule).where(*tenant_filter(VeterinarianSchedule, tenant_id))
    if veterinarian_id:
        query = query.where(VeterinarianSchedule.veterinarian_id == veterinarian_id)
    result = await db.execute(query.order_by(VeterinarianSchedule.day_of_week))
    return result.scalars().all()


@router.post("/", response_model=VeterinarianScheduleResponse, status_code=status.HTTP_201_CREATED)
async def create_schedule(
    data: VeterinarianScheduleCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_permission_dep("appointments:write")),
    tenant_id: uuid.UUID = Depends(get_tenant_id),
):
    await _validate_vet_belongs_to_tenant(db, data.veterinarian_id, tenant_id)

    schedule = VeterinarianSchedule(tenant_id=tenant_id, **data.model_dump())
    db.add(schedule)
    await db.flush()
    await db.refresh(schedule)
    return schedule


@router.patch("/{schedule_id}", response_model=VeterinarianScheduleResponse)
async def update_schedule(
    schedule_id: uuid.UUID,
    data: VeterinarianScheduleUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_permission_dep("appointments:write")),
    tenant_id: uuid.UUID = Depends(get_tenant_id),
):
    result = await db.execute(
        select(VeterinarianSchedule).where(
            VeterinarianSchedule.id == schedule_id,
            *tenant_filter(VeterinarianSchedule, tenant_id),
        )
    )
    schedule = result.scalar_one_or_none()
    if not schedule:
        raise HTTPException(status_code=404, detail="Horario no encontrado")
    for field, value in data.model_dump(exclude_unset=True).items():
        setattr(schedule, field, value)
    await db.flush()
    await db.refresh(schedule)
    return schedule


@router.delete("/{schedule_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_schedule(
    schedule_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_permission_dep("appointments:write")),
    tenant_id: uuid.UUID = Depends(get_tenant_id),
):
    result = await db.execute(
        select(VeterinarianSchedule).where(
            VeterinarianSchedule.id == schedule_id,
            *tenant_filter(VeterinarianSchedule, tenant_id),
        )
    )
    schedule = result.scalar_one_or_none()
    if not schedule:
        raise HTTPException(status_code=404, detail="Horario no encontrado")
    await db.delete(schedule)


# ─── Excepciones / Bloqueos ───────────────────────────────────────────────────

@router.get("/exceptions", response_model=list[ScheduleExceptionResponse])
async def list_exceptions(
    veterinarian_id: uuid.UUID | None = Query(None),
    date_from: date | None = Query(None),
    date_to: date | None = Query(None),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_permission_dep("appointments:read")),
    tenant_id: uuid.UUID = Depends(get_tenant_id),
):
    query = select(ScheduleException).where(*tenant_filter(ScheduleException, tenant_id))
    if veterinarian_id:
        query = query.where(ScheduleException.veterinarian_id == veterinarian_id)
    if date_from:
        query = query.where(ScheduleException.exception_date >= date_from)
    if date_to:
        query = query.where(ScheduleException.exception_date <= date_to)
    result = await db.execute(query.order_by(ScheduleException.exception_date))
    return result.scalars().all()


@router.post("/exceptions", response_model=ScheduleExceptionResponse, status_code=status.HTTP_201_CREATED)
async def create_exception(
    data: ScheduleExceptionCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_permission_dep("appointments:write")),
    tenant_id: uuid.UUID = Depends(get_tenant_id),
):
    await _validate_vet_belongs_to_tenant(db, data.veterinarian_id, tenant_id)
    exc = ScheduleException(tenant_id=tenant_id, **data.model_dump())
    db.add(exc)
    await db.flush()
    await db.refresh(exc)
    return exc


@router.patch("/exceptions/{exception_id}", response_model=ScheduleExceptionResponse)
async def update_exception(
    exception_id: uuid.UUID,
    data: ScheduleExceptionUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_permission_dep("appointments:write")),
    tenant_id: uuid.UUID = Depends(get_tenant_id),
):
    result = await db.execute(
        select(ScheduleException).where(
            ScheduleException.id == exception_id,
            *tenant_filter(ScheduleException, tenant_id),
        )
    )
    exc = result.scalar_one_or_none()
    if not exc:
        raise HTTPException(status_code=404, detail="Excepción no encontrada")
    for field, value in data.model_dump(exclude_unset=True).items():
        setattr(exc, field, value)
    await db.flush()
    await db.refresh(exc)
    return exc


@router.delete("/exceptions/{exception_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_exception(
    exception_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_permission_dep("appointments:write")),
    tenant_id: uuid.UUID = Depends(get_tenant_id),
):
    result = await db.execute(
        select(ScheduleException).where(
            ScheduleException.id == exception_id,
            *tenant_filter(ScheduleException, tenant_id),
        )
    )
    exc = result.scalar_one_or_none()
    if not exc:
        raise HTTPException(status_code=404, detail="Excepción no encontrada")
    await db.delete(exc)


# ─── Disponibilidad ───────────────────────────────────────────────────────────

@router.get("/availability", response_model=list[AvailableSlot])
async def get_availability(
    veterinarian_id: uuid.UUID = Query(...),
    target_date: date = Query(..., alias="date"),
    service_id: uuid.UUID = Query(...),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_permission_dep("appointments:read")),
    tenant_id: uuid.UUID = Depends(get_tenant_id),
):
    """Devuelve los slots disponibles de un vet para una fecha y servicio concretos."""
    return await compute_available_slots(db, veterinarian_id, target_date, service_id, tenant_id)


# ─── Helper ───────────────────────────────────────────────────────────────────

async def _validate_vet_belongs_to_tenant(
    db: AsyncSession, vet_id: uuid.UUID, tenant_id: uuid.UUID
) -> None:
    result = await db.execute(
        select(User).where(User.id == vet_id, User.tenant_id == tenant_id)
    )
    if not result.scalar_one_or_none():
        raise HTTPException(status_code=404, detail="Veterinario no encontrado en este tenant")
