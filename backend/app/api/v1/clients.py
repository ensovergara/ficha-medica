import uuid

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import func, or_, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.dependencies import get_tenant_id, require_permission_dep, tenant_filter
from app.models.client import Client
from app.models.user import User
from app.schemas.client import ClientCreate, ClientResponse, ClientUpdate

router = APIRouter(prefix="/clients", tags=["Clients"])


@router.get("/", response_model=list[ClientResponse])
async def list_clients(
    search: str | None = Query(None),
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=200),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_permission_dep("clients:read")),
    tenant_id: uuid.UUID = Depends(get_tenant_id),
):
    query = select(Client).where(*tenant_filter(Client, tenant_id))
    if search:
        query = query.where(
            or_(
                Client.first_name.ilike(f"%{search}%"),
                Client.last_name.ilike(f"%{search}%"),
                Client.rut.ilike(f"%{search}%"),
            )
        )
    result = await db.execute(query.order_by(Client.created_at.desc()).offset(skip).limit(limit))
    return result.scalars().all()


@router.get("/count")
async def count_clients(
    search: str | None = Query(None),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_permission_dep("clients:read")),
    tenant_id: uuid.UUID = Depends(get_tenant_id),
):
    query = select(func.count(Client.id)).where(*tenant_filter(Client, tenant_id))
    if search:
        query = query.where(or_(
            Client.first_name.ilike(f"%{search}%"),
            Client.last_name.ilike(f"%{search}%"),
            Client.rut.ilike(f"%{search}%"),
        ))
    return {"total": (await db.execute(query)).scalar() or 0}


@router.post("/", response_model=ClientResponse, status_code=status.HTTP_201_CREATED)
async def create_client(
    data: ClientCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_permission_dep("clients:write")),
    tenant_id: uuid.UUID = Depends(get_tenant_id),
):
    client = Client(tenant_id=tenant_id, **data.model_dump())
    db.add(client)
    await db.flush()
    await db.refresh(client)
    return client


@router.get("/{client_id}", response_model=ClientResponse)
async def get_client(
    client_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_permission_dep("clients:read")),
    tenant_id: uuid.UUID = Depends(get_tenant_id),
):
    result = await db.execute(
        select(Client).where(Client.id == client_id, *tenant_filter(Client, tenant_id))
    )
    client = result.scalar_one_or_none()
    if not client:
        raise HTTPException(status_code=404, detail="Cliente no encontrado")
    return client


@router.patch("/{client_id}", response_model=ClientResponse)
async def update_client(
    client_id: uuid.UUID,
    data: ClientUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_permission_dep("clients:write")),
    tenant_id: uuid.UUID = Depends(get_tenant_id),
):
    result = await db.execute(
        select(Client).where(Client.id == client_id, *tenant_filter(Client, tenant_id))
    )
    client = result.scalar_one_or_none()
    if not client:
        raise HTTPException(status_code=404, detail="Cliente no encontrado")

    for field, value in data.model_dump(exclude_unset=True).items():
        setattr(client, field, value)
    await db.flush()
    await db.refresh(client)
    return client


@router.delete("/{client_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_client(
    client_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_permission_dep("clients:delete")),
    tenant_id: uuid.UUID = Depends(get_tenant_id),
):
    result = await db.execute(
        select(Client).where(Client.id == client_id, *tenant_filter(Client, tenant_id))
    )
    client = result.scalar_one_or_none()
    if not client:
        raise HTTPException(status_code=404, detail="Cliente no encontrado")
    await db.delete(client)
