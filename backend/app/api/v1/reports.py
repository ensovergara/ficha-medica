import uuid
from datetime import date, datetime, timezone

from fastapi import APIRouter, Depends, Query
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.dependencies import get_tenant_id, require_permission_dep, tenant_filter
from app.models.appointment import Appointment, AppointmentStatus
from app.models.audit_log import AuditLog
from app.models.client import Client
from app.models.consultation import Consultation
from app.models.invoice import Invoice, InvoiceStatus
from app.models.patient import Patient
from app.models.user import User

router = APIRouter(prefix="/reports", tags=["Reports"])


@router.get("/summary")
async def get_summary_report(
    date_from: date = Query(default_factory=lambda: date.today().replace(day=1)),
    date_to: date = Query(default_factory=date.today),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_permission_dep("reports:read")),
    tenant_id: uuid.UUID = Depends(get_tenant_id),
):
    dt_from = datetime(date_from.year, date_from.month, date_from.day, tzinfo=timezone.utc)
    dt_to = datetime(date_to.year, date_to.month, date_to.day, 23, 59, 59, tzinfo=timezone.utc)

    # Revenue
    rev = (await db.execute(
        select(func.sum(Invoice.total)).where(Invoice.tenant_id == tenant_id, Invoice.status == InvoiceStatus.PAID, Invoice.paid_at.between(dt_from, dt_to))
    )).scalar() or 0

    # Invoices count by status
    inv_counts = (await db.execute(
        select(Invoice.status, func.count(Invoice.id)).where(Invoice.tenant_id == tenant_id, Invoice.created_at.between(dt_from, dt_to)).group_by(Invoice.status)
    )).all()

    # Consultations
    cons_count = (await db.execute(
        select(func.count(Consultation.id)).where(Consultation.tenant_id == tenant_id, Consultation.created_at.between(dt_from, dt_to))
    )).scalar() or 0

    # New patients
    new_patients = (await db.execute(
        select(func.count(Patient.id)).where(Patient.tenant_id == tenant_id, Patient.created_at.between(dt_from, dt_to))
    )).scalar() or 0

    # New clients
    new_clients = (await db.execute(
        select(func.count(Client.id)).where(Client.tenant_id == tenant_id, Client.created_at.between(dt_from, dt_to))
    )).scalar() or 0

    # Appointments by status
    apt_counts = (await db.execute(
        select(Appointment.status, func.count(Appointment.id)).where(
            Appointment.tenant_id == tenant_id,
            Appointment.date.between(date_from, date_to),
        ).group_by(Appointment.status)
    )).all()

    return {
        "period": {"from": date_from.isoformat(), "to": date_to.isoformat()},
        "revenue": float(rev),
        "invoices": {status.value: count for status, count in inv_counts},
        "consultations": cons_count,
        "new_patients": new_patients,
        "new_clients": new_clients,
        "appointments": {status.value: count for status, count in apt_counts},
    }


@router.get("/patients-by-species")
async def patients_by_species(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_permission_dep("reports:read")),
    tenant_id: uuid.UUID = Depends(get_tenant_id),
):
    result = (await db.execute(
        select(Patient.species, func.count(Patient.id))
        .where(Patient.tenant_id == tenant_id, Patient.is_active == True)
        .group_by(Patient.species)
        .order_by(func.count(Patient.id).desc())
    )).all()
    return [{"species": s, "count": c} for s, c in result]


@router.get("/audit-log")
async def get_audit_log(
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=200),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_permission_dep("reports:read")),
    tenant_id: uuid.UUID = Depends(get_tenant_id),
):
    result = await db.execute(
        select(AuditLog).where(*tenant_filter(AuditLog, tenant_id)).order_by(AuditLog.created_at.desc()).offset(skip).limit(limit)
    )
    logs = result.scalars().all()
    return [
        {"id": str(l.id), "action": l.action, "resource_type": l.resource_type, "resource_id": l.resource_id, "created_at": l.created_at.isoformat()}
        for l in logs
    ]
