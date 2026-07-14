import uuid
from datetime import date, datetime, timezone

from fastapi import APIRouter, Depends
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.dependencies import get_current_user, get_tenant_id
from app.models.appointment import Appointment, AppointmentStatus
from app.models.client import Client
from app.models.invoice import Invoice, InvoiceStatus
from app.models.inventory import Product
from app.models.patient import Patient
from app.models.user import User

router = APIRouter(prefix="/stats", tags=["Stats"])


@router.get("/dashboard")
async def get_dashboard_stats(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
    tenant_id: uuid.UUID = Depends(get_tenant_id),
):
    today = date.today()

    def tenant_filter(model):
        return [] if tenant_id is None else [model.tenant_id == tenant_id]

    async def count(model, *filters):
        q = select(func.count(model.id)).where(*tenant_filter(model), *filters)
        return (await db.execute(q)).scalar() or 0

    patients_total = await count(Patient, Patient.is_active == True)
    clients_total = await count(Client)
    appointments_today = await count(Appointment, Appointment.date == today)
    appointments_pending = await count(Appointment, Appointment.status == AppointmentStatus.SCHEDULED)
    low_stock_count = await count(Product, Product.stock_quantity <= Product.min_stock, Product.is_active == True)

    first_of_month = today.replace(day=1)
    rev_q = select(func.sum(Invoice.total)).where(
        *tenant_filter(Invoice),
        Invoice.status == InvoiceStatus.PAID,
        Invoice.paid_at >= datetime(first_of_month.year, first_of_month.month, 1, tzinfo=timezone.utc),
    )
    revenue_month = float((await db.execute(rev_q)).scalar() or 0)

    patients_month = await count(
        Patient,
        Patient.created_at >= datetime(first_of_month.year, first_of_month.month, 1, tzinfo=timezone.utc),
    )

    return {
        "patients_total": patients_total,
        "clients_total": clients_total,
        "appointments_today": appointments_today,
        "appointments_pending": appointments_pending,
        "low_stock_count": low_stock_count,
        "revenue_month": revenue_month,
        "patients_month": patients_month,
    }
