import uuid

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import func, or_, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.plan_limits import check_patient_limit
from app.database import get_db
from app.dependencies import get_tenant_id, require_permission_dep, tenant_filter
from app.models.patient import Patient
from app.models.user import User
from app.schemas.patient import PatientCreate, PatientResponse, PatientUpdate

router = APIRouter(prefix="/patients", tags=["Patients"])


@router.get("/", response_model=list[PatientResponse])
async def list_patients(
    search: str | None = Query(None),
    species: str | None = Query(None),
    client_id: uuid.UUID | None = Query(None),
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=200),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_permission_dep("patients:read")),
    tenant_id: uuid.UUID = Depends(get_tenant_id),
):
    query = select(Patient).where(*tenant_filter(Patient, tenant_id), Patient.is_active == True)
    if search:
        query = query.where(
            or_(Patient.name.ilike(f"%{search}%"), Patient.microchip.ilike(f"%{search}%"))
        )
    if species:
        query = query.where(Patient.species == species)
    if client_id:
        query = query.where(Patient.client_id == client_id)
    result = await db.execute(query.order_by(Patient.created_at.desc()).offset(skip).limit(limit))
    return result.scalars().all()


@router.get("/count")
async def count_patients(
    search: str | None = Query(None),
    species: str | None = Query(None),
    client_id: uuid.UUID | None = Query(None),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_permission_dep("patients:read")),
    tenant_id: uuid.UUID = Depends(get_tenant_id),
):
    query = select(func.count(Patient.id)).where(*tenant_filter(Patient, tenant_id), Patient.is_active == True)
    if search:
        query = query.where(or_(Patient.name.ilike(f"%{search}%"), Patient.microchip.ilike(f"%{search}%")))
    if species:
        query = query.where(Patient.species == species)
    if client_id:
        query = query.where(Patient.client_id == client_id)
    return {"total": (await db.execute(query)).scalar() or 0}


@router.post("/", response_model=PatientResponse, status_code=status.HTTP_201_CREATED)
async def create_patient(
    data: PatientCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_permission_dep("patients:write")),
    tenant_id: uuid.UUID = Depends(get_tenant_id),
):
    if tenant_id:
        await check_patient_limit(db, tenant_id)
    patient = Patient(tenant_id=tenant_id, **data.model_dump())
    db.add(patient)
    await db.flush()
    await db.refresh(patient)
    return patient


@router.get("/{patient_id}", response_model=PatientResponse)
async def get_patient(
    patient_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_permission_dep("patients:read")),
    tenant_id: uuid.UUID = Depends(get_tenant_id),
):
    result = await db.execute(
        select(Patient).where(Patient.id == patient_id, *tenant_filter(Patient, tenant_id))
    )
    patient = result.scalar_one_or_none()
    if not patient:
        raise HTTPException(status_code=404, detail="Paciente no encontrado")
    return patient


@router.patch("/{patient_id}", response_model=PatientResponse)
async def update_patient(
    patient_id: uuid.UUID,
    data: PatientUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_permission_dep("patients:write")),
    tenant_id: uuid.UUID = Depends(get_tenant_id),
):
    result = await db.execute(
        select(Patient).where(Patient.id == patient_id, *tenant_filter(Patient, tenant_id))
    )
    patient = result.scalar_one_or_none()
    if not patient:
        raise HTTPException(status_code=404, detail="Paciente no encontrado")

    for field, value in data.model_dump(exclude_unset=True).items():
        setattr(patient, field, value)
    await db.flush()
    await db.refresh(patient)
    return patient
