import uuid

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.features import has_feature
from app.database import get_db
from app.dependencies import get_tenant_id, require_permission_dep, tenant_filter
from app.models.inventory import MovementType, Product, StockMovement
from app.models.user import User
from app.schemas.inventory import (
    ProductCreate,
    ProductResponse,
    ProductUpdate,
    StockMovementCreate,
    StockMovementResponse,
)

router = APIRouter(prefix="/inventory", tags=["Inventory"])


@router.get("/products/", response_model=list[ProductResponse])
async def list_products(
    search: str | None = Query(None),
    category: str | None = Query(None),
    low_stock: bool = Query(False),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_permission_dep("inventory:read")),
    tenant_id: uuid.UUID = Depends(get_tenant_id),
):
    query = select(Product).where(*tenant_filter(Product, tenant_id))
    if search:
        query = query.where(Product.name.ilike(f"%{search}%"))
    if category:
        query = query.where(Product.category == category)
    if low_stock:
        query = query.where(Product.stock_quantity <= Product.min_stock)
    result = await db.execute(query.order_by(Product.name))
    return result.scalars().all()


@router.post("/products/", response_model=ProductResponse, status_code=status.HTTP_201_CREATED)
async def create_product(
    data: ProductCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_permission_dep("inventory:write")),
    tenant_id: uuid.UUID = Depends(get_tenant_id),
):
    if not await has_feature(db, tenant_id, "inventory"):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Feature 'Gestión de Inventario' no disponible en tu plan",
        )

    product = Product(tenant_id=tenant_id, **data.model_dump())
    db.add(product)
    await db.flush()
    await db.refresh(product)
    return product


@router.patch("/products/{product_id}", response_model=ProductResponse)
async def update_product(
    product_id: uuid.UUID,
    data: ProductUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_permission_dep("inventory:write")),
    tenant_id: uuid.UUID = Depends(get_tenant_id),
):
    if not await has_feature(db, tenant_id, "inventory"):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Feature 'Gestión de Inventario' no disponible en tu plan",
        )

    result = await db.execute(
        select(Product).where(Product.id == product_id, *tenant_filter(Product, tenant_id))
    )
    product = result.scalar_one_or_none()
    if not product:
        raise HTTPException(status_code=404, detail="Producto no encontrado")

    for field, value in data.model_dump(exclude_unset=True).items():
        setattr(product, field, value)
    await db.flush()
    await db.refresh(product)
    return product


@router.post("/stock-movements/", response_model=StockMovementResponse, status_code=status.HTTP_201_CREATED)
async def create_stock_movement(
    data: StockMovementCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_permission_dep("inventory:write")),
    tenant_id: uuid.UUID = Depends(get_tenant_id),
):
    if not await has_feature(db, tenant_id, "inventory"):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Feature 'Gestión de Inventario' no disponible en tu plan",
        )

    result = await db.execute(
        select(Product).where(Product.id == data.product_id, Product.tenant_id == tenant_id)
    )
    product = result.scalar_one_or_none()
    if not product:
        raise HTTPException(status_code=404, detail="Producto no encontrado")

    if data.movement_type == MovementType.IN:
        product.stock_quantity += data.quantity
    elif data.movement_type == MovementType.OUT:
        if product.stock_quantity < data.quantity:
            raise HTTPException(status_code=400, detail="Stock insuficiente")
        product.stock_quantity -= data.quantity
    else:
        product.stock_quantity = data.quantity

    movement = StockMovement(
        tenant_id=tenant_id,
        created_by=current_user.id,
        **data.model_dump(),
    )
    db.add(movement)
    await db.flush()
    await db.refresh(movement)
    return movement


@router.get("/stock-movements/", response_model=list[StockMovementResponse])
async def list_stock_movements(
    product_id: uuid.UUID | None = Query(None),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_permission_dep("inventory:read")),
    tenant_id: uuid.UUID = Depends(get_tenant_id),
):
    query = select(StockMovement).where(*tenant_filter(StockMovement, tenant_id))
    if product_id:
        query = query.where(StockMovement.product_id == product_id)
    result = await db.execute(query.order_by(StockMovement.created_at.desc()))
    return result.scalars().all()
