import uuid
from datetime import datetime

from pydantic import BaseModel

from app.models.invoice import InvoiceStatus


class InvoiceItemCreate(BaseModel):
    description: str
    quantity: int = 1
    unit_price: float


class InvoiceCreate(BaseModel):
    client_id: uuid.UUID
    items: list[InvoiceItemCreate]


class InvoiceUpdate(BaseModel):
    status: InvoiceStatus | None = None


class InvoiceItemResponse(BaseModel):
    id: uuid.UUID
    description: str
    quantity: int
    unit_price: float
    total: float

    model_config = {"from_attributes": True}


class InvoiceResponse(BaseModel):
    id: uuid.UUID
    tenant_id: uuid.UUID
    client_id: uuid.UUID
    invoice_number: str
    subtotal: float
    tax: float
    total: float
    status: InvoiceStatus
    issued_at: datetime | None
    paid_at: datetime | None
    items: list[InvoiceItemResponse] = []
    created_at: datetime

    model_config = {"from_attributes": True}


class PaymentCreate(BaseModel):
    invoice_id: uuid.UUID
    amount: float
    payment_method: str


class PaymentResponse(BaseModel):
    id: uuid.UUID
    tenant_id: uuid.UUID
    invoice_id: uuid.UUID
    amount: float
    payment_method: str
    created_at: datetime

    model_config = {"from_attributes": True}
