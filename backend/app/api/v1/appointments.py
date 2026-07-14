import uuid
from datetime import date, time as dt_time

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import and_, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.dependencies import get_tenant_id, require_permission_dep, tenant_filter
from app.models.appointment import Appointment, AppointmentStatus
from app.models.user import User
from app.schemas.appointment import AppointmentCreate, AppointmentResponse, AppointmentUpdate

router = APIRouter(prefix="/appointments", tags=["Appointments"])


async def _check_conflict(
    db: AsyncSession,
    veterinarian_id: uuid.UUID,
    appt_date: date,
    start_time: dt_time,
    end_time: dt_time | None,
    tenant_id: uuid.UUID,
    exclude_id: uuid.UUID | None = None,
) -> None:
    """Raise 409 if the vet already has an overlapping active appointment."""
    if end_time is None:
        # Without end_time we can't check overlap — skip conflict detection
        return

    query = select(Appointment).where(
        Appointment.veterinarian_id == veterinarian_id,
        Appointment.date == appt_date,
        Appointment.tenant_id == tenant_id,
        Appointment.status.notin_([AppointmentStatus.CANCELLED]),
        Appointment.end_time.isnot(None),
        # Overlap: existing.start < new.end AND existing.end > new.start
        Appointment.start_time < end_time,
        Appointment.end_time > start_time,
    )
    if exclude_id:
        query = query.where(Appointment.id != exclude_id)

    result = await db.execute(query)
    conflict = result.scalars().first()
    if conflict:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"El veterinario ya tiene una cita de {conflict.start_time.strftime('%H:%M')} a {conflict.end_time.strftime('%H:%M')} ese día.",
        )


@router.get("/", response_model=list[AppointmentResponse])
async def list_appointments(
    date_from: date | None = Query(None),
    date_to: date | None = Query(None),
    veterinarian_id: uuid.UUID | None = Query(None),
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=200),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_permission_dep("appointments:read")),
    tenant_id: uuid.UUID = Depends(get_tenant_id),
):
    query = select(Appointment).where(*tenant_filter(Appointment, tenant_id))
    if date_from:
        query = query.where(Appointment.date >= date_from)
    if date_to:
        query = query.where(Appointment.date <= date_to)
    if veterinarian_id:
        query = query.where(Appointment.veterinarian_id == veterinarian_id)
    result = await db.execute(query.order_by(Appointment.date, Appointment.start_time).offset(skip).limit(limit))
    return result.scalars().all()


@router.post("/", response_model=AppointmentResponse, status_code=status.HTTP_201_CREATED)
async def create_appointment(
    data: AppointmentCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_permission_dep("appointments:write")),
    tenant_id: uuid.UUID = Depends(get_tenant_id),
):
    await _check_conflict(
        db,
        data.veterinarian_id,
        data.date,
        data.start_time,
        data.end_time,
        tenant_id,
    )
    appointment = Appointment(tenant_id=tenant_id, **data.model_dump())
    db.add(appointment)
    await db.flush()
    await db.refresh(appointment)
    return appointment


@router.get("/{appointment_id}", response_model=AppointmentResponse)
async def get_appointment(
    appointment_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_permission_dep("appointments:read")),
    tenant_id: uuid.UUID = Depends(get_tenant_id),
):
    result = await db.execute(
        select(Appointment).where(Appointment.id == appointment_id, *tenant_filter(Appointment, tenant_id))
    )
    appointment = result.scalar_one_or_none()
    if not appointment:
        raise HTTPException(status_code=404, detail="Cita no encontrada")
    return appointment


@router.patch("/{appointment_id}", response_model=AppointmentResponse)
async def update_appointment(
    appointment_id: uuid.UUID,
    data: AppointmentUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_permission_dep("appointments:write")),
    tenant_id: uuid.UUID = Depends(get_tenant_id),
):
    result = await db.execute(
        select(Appointment).where(Appointment.id == appointment_id, *tenant_filter(Appointment, tenant_id))
    )
    appointment = result.scalar_one_or_none()
    if not appointment:
        raise HTTPException(status_code=404, detail="Cita no encontrada")

    # Apply updates to get the resulting state for conflict check
    updated = data.model_dump(exclude_unset=True)
    new_date = updated.get("date", appointment.date)
    new_start = updated.get("start_time", appointment.start_time)
    new_end = updated.get("end_time", appointment.end_time)

    if "date" in updated or "start_time" in updated or "end_time" in updated:
        await _check_conflict(
            db,
            appointment.veterinarian_id,
            new_date,
            new_start,
            new_end,
            tenant_id,
            exclude_id=appointment_id,
        )

    for field, value in updated.items():
        setattr(appointment, field, value)
    await db.flush()
    await db.refresh(appointment)
    return appointment


@router.delete("/{appointment_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_appointment(
    appointment_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_permission_dep("appointments:delete")),
    tenant_id: uuid.UUID = Depends(get_tenant_id),
):
    result = await db.execute(
        select(Appointment).where(Appointment.id == appointment_id, *tenant_filter(Appointment, tenant_id))
    )
    appointment = result.scalar_one_or_none()
    if not appointment:
        raise HTTPException(status_code=404, detail="Cita no encontrada")
    await db.delete(appointment)
