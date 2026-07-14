import uuid

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.dependencies import get_tenant_id, require_permission_dep, tenant_filter
from app.models.service import Service, VeterinarianService
from app.models.user import User, UserRole
from app.schemas.service import (
    ServiceCreate,
    ServiceResponse,
    ServiceUpdate,
    VeterinarianServiceAssign,
    VeterinarianServiceResponse,
)

router = APIRouter(prefix="/services", tags=["Services"])


@router.get("/", response_model=list[ServiceResponse])
async def list_services(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_permission_dep("appointments:read")),
    tenant_id: uuid.UUID = Depends(get_tenant_id),
):
    result = await db.execute(
        select(Service)
        .where(*tenant_filter(Service, tenant_id))
        .order_by(Service.name)
    )
    return result.scalars().all()


@router.post("/", response_model=ServiceResponse, status_code=status.HTTP_201_CREATED)
async def create_service(
    data: ServiceCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_permission_dep("appointments:write")),
    tenant_id: uuid.UUID = Depends(get_tenant_id),
):
    service = Service(tenant_id=tenant_id, **data.model_dump())
    db.add(service)
    await db.flush()
    await db.refresh(service)
    return service


@router.get("/{service_id}", response_model=ServiceResponse)
async def get_service(
    service_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_permission_dep("appointments:read")),
    tenant_id: uuid.UUID = Depends(get_tenant_id),
):
    result = await db.execute(
        select(Service).where(Service.id == service_id, *tenant_filter(Service, tenant_id))
    )
    service = result.scalar_one_or_none()
    if not service:
        raise HTTPException(status_code=404, detail="Servicio no encontrado")
    return service


@router.patch("/{service_id}", response_model=ServiceResponse)
async def update_service(
    service_id: uuid.UUID,
    data: ServiceUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_permission_dep("appointments:write")),
    tenant_id: uuid.UUID = Depends(get_tenant_id),
):
    result = await db.execute(
        select(Service).where(Service.id == service_id, *tenant_filter(Service, tenant_id))
    )
    service = result.scalar_one_or_none()
    if not service:
        raise HTTPException(status_code=404, detail="Servicio no encontrado")
    for field, value in data.model_dump(exclude_unset=True).items():
        setattr(service, field, value)
    await db.flush()
    await db.refresh(service)
    return service


@router.delete("/{service_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_service(
    service_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_permission_dep("appointments:write")),
    tenant_id: uuid.UUID = Depends(get_tenant_id),
):
    result = await db.execute(
        select(Service).where(Service.id == service_id, *tenant_filter(Service, tenant_id))
    )
    service = result.scalar_one_or_none()
    if not service:
        raise HTTPException(status_code=404, detail="Servicio no encontrado")
    await db.delete(service)


# --- Asignación de vets a servicios ---

@router.get("/{service_id}/vets", response_model=list[VeterinarianServiceResponse])
async def list_service_vets(
    service_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_permission_dep("appointments:read")),
    tenant_id: uuid.UUID = Depends(get_tenant_id),
):
    await _get_service_or_404(db, service_id, tenant_id)
    result = await db.execute(
        select(VeterinarianService).where(VeterinarianService.service_id == service_id)
    )
    return result.scalars().all()


@router.post("/{service_id}/vets", response_model=VeterinarianServiceResponse, status_code=status.HTTP_201_CREATED)
async def assign_vet_to_service(
    service_id: uuid.UUID,
    data: VeterinarianServiceAssign,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_permission_dep("appointments:write")),
    tenant_id: uuid.UUID = Depends(get_tenant_id),
):
    await _get_service_or_404(db, service_id, tenant_id)

    # Verificar que el vet pertenece al tenant
    vet_result = await db.execute(
        select(User).where(User.id == data.veterinarian_id, User.tenant_id == tenant_id)
    )
    if not vet_result.scalar_one_or_none():
        raise HTTPException(status_code=404, detail="Veterinario no encontrado en este tenant")

    # Verificar que no existe ya la asignación
    existing = await db.execute(
        select(VeterinarianService).where(
            VeterinarianService.veterinarian_id == data.veterinarian_id,
            VeterinarianService.service_id == service_id,
        )
    )
    if existing.scalar_one_or_none():
        raise HTTPException(status_code=409, detail="El veterinario ya tiene este servicio asignado")

    assignment = VeterinarianService(veterinarian_id=data.veterinarian_id, service_id=service_id)
    db.add(assignment)
    await db.flush()
    await db.refresh(assignment)
    return assignment


@router.delete("/{service_id}/vets/{vet_id}", status_code=status.HTTP_204_NO_CONTENT)
async def remove_vet_from_service(
    service_id: uuid.UUID,
    vet_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_permission_dep("appointments:write")),
    tenant_id: uuid.UUID = Depends(get_tenant_id),
):
    await _get_service_or_404(db, service_id, tenant_id)
    result = await db.execute(
        select(VeterinarianService).where(
            VeterinarianService.veterinarian_id == vet_id,
            VeterinarianService.service_id == service_id,
        )
    )
    assignment = result.scalar_one_or_none()
    if not assignment:
        raise HTTPException(status_code=404, detail="Asignación no encontrada")
    await db.delete(assignment)


async def _get_service_or_404(db, service_id: uuid.UUID, tenant_id: uuid.UUID) -> Service:
    result = await db.execute(
        select(Service).where(Service.id == service_id, *tenant_filter(Service, tenant_id))
    )
    service = result.scalar_one_or_none()
    if not service:
        raise HTTPException(status_code=404, detail="Servicio no encontrado")
    return service
