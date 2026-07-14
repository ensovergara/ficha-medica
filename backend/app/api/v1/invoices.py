import uuid
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.dependencies import get_tenant_id, require_permission_dep, tenant_filter
from app.models.invoice import Invoice, InvoiceItem, InvoiceStatus, Payment
from app.models.user import User
from app.schemas.invoice import (
    InvoiceCreate,
    InvoiceResponse,
    InvoiceUpdate,
    PaymentCreate,
    PaymentResponse,
)

router = APIRouter(prefix="/invoices", tags=["Invoices"])

TAX_RATE = 0.19


@router.get("/", response_model=list[InvoiceResponse])
async def list_invoices(
    status_filter: InvoiceStatus | None = Query(None, alias="status"),
    client_id: uuid.UUID | None = Query(None),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_permission_dep("invoices:read")),
    tenant_id: uuid.UUID = Depends(get_tenant_id),
):
    query = select(Invoice).where(*tenant_filter(Invoice, tenant_id))
    if status_filter:
        query = query.where(Invoice.status == status_filter)
    if client_id:
        query = query.where(Invoice.client_id == client_id)
    result = await db.execute(query.order_by(Invoice.created_at.desc()))
    return result.scalars().all()


@router.post("/", response_model=InvoiceResponse, status_code=status.HTTP_201_CREATED)
async def create_invoice(
    data: InvoiceCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_permission_dep("invoices:write")),
    tenant_id: uuid.UUID = Depends(get_tenant_id),
):
    # Generate invoice number
    count_result = await db.execute(
        select(func.count(Invoice.id)).where(*tenant_filter(Invoice, tenant_id))
    )
    count = count_result.scalar() + 1
    invoice_number = f"INV-{count:06d}"

    subtotal = sum(item.quantity * item.unit_price for item in data.items)
    tax = round(subtotal * TAX_RATE, 2)
    total = round(subtotal + tax, 2)

    invoice = Invoice(
        tenant_id=tenant_id,
        client_id=data.client_id,
        invoice_number=invoice_number,
        subtotal=subtotal,
        tax=tax,
        total=total,
    )
    db.add(invoice)
    await db.flush()

    for item_data in data.items:
        item = InvoiceItem(
            invoice_id=invoice.id,
            description=item_data.description,
            quantity=item_data.quantity,
            unit_price=item_data.unit_price,
            total=round(item_data.quantity * item_data.unit_price, 2),
        )
        db.add(item)

    await db.flush()
    await db.refresh(invoice)
    return invoice


@router.get("/{invoice_id}", response_model=InvoiceResponse)
async def get_invoice(
    invoice_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_permission_dep("invoices:read")),
    tenant_id: uuid.UUID = Depends(get_tenant_id),
):
    result = await db.execute(
        select(Invoice).where(Invoice.id == invoice_id, *tenant_filter(Invoice, tenant_id))
    )
    invoice = result.scalar_one_or_none()
    if not invoice:
        raise HTTPException(status_code=404, detail="Factura no encontrada")
    return invoice


@router.patch("/{invoice_id}", response_model=InvoiceResponse)
async def update_invoice(
    invoice_id: uuid.UUID,
    data: InvoiceUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_permission_dep("invoices:write")),
    tenant_id: uuid.UUID = Depends(get_tenant_id),
):
    result = await db.execute(
        select(Invoice).where(Invoice.id == invoice_id, *tenant_filter(Invoice, tenant_id))
    )
    invoice = result.scalar_one_or_none()
    if not invoice:
        raise HTTPException(status_code=404, detail="Factura no encontrada")

    if data.status:
        invoice.status = data.status
        if data.status == InvoiceStatus.ISSUED:
            invoice.issued_at = datetime.now(timezone.utc)
        elif data.status == InvoiceStatus.PAID:
            invoice.paid_at = datetime.now(timezone.utc)
    await db.flush()
    await db.refresh(invoice)
    return invoice


# --- Payments ---
@router.post("/payments/", response_model=PaymentResponse, status_code=status.HTTP_201_CREATED)
async def create_payment(
    data: PaymentCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_permission_dep("invoices:write")),
    tenant_id: uuid.UUID = Depends(get_tenant_id),
):
    result = await db.execute(
        select(Invoice).where(Invoice.id == data.invoice_id, *tenant_filter(Invoice, tenant_id))
    )
    invoice = result.scalar_one_or_none()
    if not invoice:
        raise HTTPException(status_code=404, detail="Factura no encontrada")

    payment = Payment(tenant_id=tenant_id, **data.model_dump())
    db.add(payment)

    invoice.status = InvoiceStatus.PAID
    invoice.paid_at = datetime.now(timezone.utc)

    await db.flush()
    await db.refresh(payment)
    return payment
