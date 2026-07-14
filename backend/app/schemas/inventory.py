import uuid
from datetime import datetime

from pydantic import BaseModel

from app.models.inventory import MovementType


class ProductCreate(BaseModel):
    name: str
    category: str | None = None
    sku: str | None = None
    unit: str | None = None
    stock_quantity: int = 0
    min_stock: int = 0
    price: float | None = None
    description: str | None = None


class ProductUpdate(BaseModel):
    name: str | None = None
    category: str | None = None
    sku: str | None = None
    unit: str | None = None
    min_stock: int | None = None
    price: float | None = None
    description: str | None = None
    is_active: bool | None = None


class ProductResponse(BaseModel):
    id: uuid.UUID
    tenant_id: uuid.UUID
    name: str
    category: str | None
    sku: str | None
    unit: str | None
    stock_quantity: int
    min_stock: int
    price: float | None
    description: str | None
    is_active: bool
    created_at: datetime

    model_config = {"from_attributes": True}


class StockMovementCreate(BaseModel):
    product_id: uuid.UUID
    movement_type: MovementType
    quantity: int
    reason: str | None = None


class StockMovementResponse(BaseModel):
    id: uuid.UUID
    tenant_id: uuid.UUID
    product_id: uuid.UUID
    movement_type: MovementType
    quantity: int
    reason: str | None
    created_by: uuid.UUID
    created_at: datetime

    model_config = {"from_attributes": True}
