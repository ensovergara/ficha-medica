"""
Motor de cálculo de slots disponibles para un veterinario.

Lógica:
1. Obtener duración del servicio
2. Buscar horario recurrente del vet para ese día de semana
3. Verificar excepciones (vacaciones/bloqueos) para esa fecha
4. Generar todos los slots del día en intervalos de `duration_minutes`
5. Filtrar slots que solapan con citas confirmadas
6. Filtrar slots que caen dentro de excepciones parciales
"""

import uuid
from datetime import date, datetime, time, timedelta

from sqlalchemy import and_, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.appointment import Appointment, AppointmentStatus
from app.models.schedule import ScheduleException, VeterinarianSchedule
from app.models.service import Service
from app.schemas.schedule import AvailableSlot


def _time_to_minutes(t: time) -> int:
    return t.hour * 60 + t.minute


def _minutes_to_time(m: int) -> time:
    return time(hour=m // 60, minute=m % 60)


def _slots_overlap(s1_start: int, s1_end: int, s2_start: int, s2_end: int) -> bool:
    """Devuelve True si dos intervalos se solapan (exclusive en extremos)."""
    return s1_start < s2_end and s2_start < s1_end


async def compute_available_slots(
    db: AsyncSession,
    veterinarian_id: uuid.UUID,
    target_date: date,
    service_id: uuid.UUID,
    tenant_id: uuid.UUID,
) -> list[AvailableSlot]:
    # 1. Duración del servicio
    svc_result = await db.execute(
        select(Service).where(Service.id == service_id, Service.tenant_id == tenant_id, Service.is_active == True)
    )
    service = svc_result.scalar_one_or_none()
    if not service:
        return []
    duration = service.duration_minutes

    # 2. Horario recurrente del vet para ese día de la semana (puede haber varios bloques)
    day_of_week = target_date.weekday()  # 0=Lunes, 6=Domingo
    sched_result = await db.execute(
        select(VeterinarianSchedule).where(
            VeterinarianSchedule.veterinarian_id == veterinarian_id,
            VeterinarianSchedule.tenant_id == tenant_id,
            VeterinarianSchedule.day_of_week == day_of_week,
            VeterinarianSchedule.is_active == True,
        )
    )
    schedules = sched_result.scalars().all()
    if not schedules:
        return []  # No trabaja ese día

    # 3. Excepciones para esa fecha
    exc_result = await db.execute(
        select(ScheduleException).where(
            ScheduleException.veterinarian_id == veterinarian_id,
            ScheduleException.tenant_id == tenant_id,
            ScheduleException.exception_date == target_date,
        )
    )
    exceptions = exc_result.scalars().all()

    # Si hay excepción de día completo (sin start/end), el vet no está disponible
    for exc in exceptions:
        if exc.start_time is None:
            return []

    # 4. Generar todos los slots del día (iterando sobre todos los bloques del horario)
    all_slots: list[tuple[int, int]] = []
    for schedule in schedules:
        block_start = _time_to_minutes(schedule.start_time)
        block_end = _time_to_minutes(schedule.end_time)
        cursor = block_start
        while cursor + duration <= block_end:
            all_slots.append((cursor, cursor + duration))
            cursor += duration

    if not all_slots:
        return []

    # 5. Citas ya agendadas ese día (no canceladas)
    booked_result = await db.execute(
        select(Appointment).where(
            Appointment.veterinarian_id == veterinarian_id,
            Appointment.tenant_id == tenant_id,
            Appointment.date == target_date,
            Appointment.status.notin_([AppointmentStatus.CANCELLED]),
        )
    )
    booked = booked_result.scalars().all()
    booked_intervals: list[tuple[int, int]] = []
    for appt in booked:
        b_start = _time_to_minutes(appt.start_time)
        b_end = _time_to_minutes(appt.end_time) if appt.end_time else b_start + duration
        booked_intervals.append((b_start, b_end))

    # 6. Intervalos parciales bloqueados por excepciones
    exception_intervals: list[tuple[int, int]] = [
        (_time_to_minutes(exc.start_time), _time_to_minutes(exc.end_time))
        for exc in exceptions
        if exc.start_time is not None and exc.end_time is not None
    ]

    # 7. Filtrar slots disponibles
    available: list[AvailableSlot] = []
    for slot_start, slot_end in all_slots:
        blocked = any(
            _slots_overlap(slot_start, slot_end, b_start, b_end)
            for b_start, b_end in booked_intervals
        ) or any(
            _slots_overlap(slot_start, slot_end, e_start, e_end)
            for e_start, e_end in exception_intervals
        )
        if not blocked:
            available.append(
                AvailableSlot(
                    start_time=_minutes_to_time(slot_start),
                    end_time=_minutes_to_time(slot_end),
                )
            )

    return available
