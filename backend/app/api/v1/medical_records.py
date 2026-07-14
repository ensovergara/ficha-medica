import uuid

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.dependencies import get_current_user, get_tenant_id, require_permission_dep, tenant_filter
from app.models.consultation import Consultation
from app.models.lab_result import LabResult
from app.models.medical_record import MedicalRecord
from app.models.prescription import Prescription
from app.models.user import User
from app.models.vaccination import Vaccination
from app.schemas.medical import (
    ConsultationCreate,
    ConsultationResponse,
    LabResultCreate,
    LabResultResponse,
    MedicalRecordCreate,
    MedicalRecordResponse,
    PrescriptionCreate,
    PrescriptionResponse,
    VaccinationCreate,
    VaccinationResponse,
)

router = APIRouter(tags=["Medical Records"])


# --- Medical Records ---
@router.get("/medical-records/", response_model=list[MedicalRecordResponse])
async def list_medical_records(
    patient_id: uuid.UUID | None = None,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_permission_dep("medical_records:read")),
    tenant_id: uuid.UUID = Depends(get_tenant_id),
):
    query = select(MedicalRecord).where(*tenant_filter(MedicalRecord, tenant_id))
    if patient_id:
        query = query.where(MedicalRecord.patient_id == patient_id)
    result = await db.execute(query.order_by(MedicalRecord.created_at.desc()))
    return result.scalars().all()


@router.post("/medical-records/", response_model=MedicalRecordResponse, status_code=status.HTTP_201_CREATED)
async def create_medical_record(
    data: MedicalRecordCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_permission_dep("medical_records:write")),
    tenant_id: uuid.UUID = Depends(get_tenant_id),
):
    record = MedicalRecord(tenant_id=tenant_id, **data.model_dump())
    db.add(record)
    await db.flush()
    await db.refresh(record)
    return record


@router.get("/medical-records/{record_id}", response_model=MedicalRecordResponse)
async def get_medical_record(
    record_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_permission_dep("medical_records:read")),
    tenant_id: uuid.UUID = Depends(get_tenant_id),
):
    result = await db.execute(
        select(MedicalRecord).where(MedicalRecord.id == record_id, *tenant_filter(MedicalRecord, tenant_id))
    )
    record = result.scalar_one_or_none()
    if not record:
        raise HTTPException(status_code=404, detail="Ficha médica no encontrada")
    return record


# --- Consultations ---
@router.get("/consultations/", response_model=list[ConsultationResponse])
async def list_consultations(
    medical_record_id: uuid.UUID | None = None,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_permission_dep("consultations:read")),
    tenant_id: uuid.UUID = Depends(get_tenant_id),
):
    query = select(Consultation).where(*tenant_filter(Consultation, tenant_id))
    if medical_record_id:
        query = query.where(Consultation.medical_record_id == medical_record_id)
    result = await db.execute(query.order_by(Consultation.created_at.desc()))
    return result.scalars().all()


@router.post("/consultations/", response_model=ConsultationResponse, status_code=status.HTTP_201_CREATED)
async def create_consultation(
    data: ConsultationCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_permission_dep("consultations:write")),
    tenant_id: uuid.UUID = Depends(get_tenant_id),
):
    consultation = Consultation(
        tenant_id=tenant_id,
        veterinarian_id=current_user.id,
        **data.model_dump(),
    )
    db.add(consultation)
    await db.flush()
    await db.refresh(consultation)
    return consultation


# --- Vaccinations ---
@router.get("/vaccinations/", response_model=list[VaccinationResponse])
async def list_vaccinations(
    patient_id: uuid.UUID | None = None,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_permission_dep("vaccinations:read")),
    tenant_id: uuid.UUID = Depends(get_tenant_id),
):
    query = select(Vaccination).where(*tenant_filter(Vaccination, tenant_id))
    if patient_id:
        query = query.where(Vaccination.patient_id == patient_id)
    result = await db.execute(query.order_by(Vaccination.created_at.desc()))
    return result.scalars().all()


@router.post("/vaccinations/", response_model=VaccinationResponse, status_code=status.HTTP_201_CREATED)
async def create_vaccination(
    data: VaccinationCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_permission_dep("vaccinations:write")),
    tenant_id: uuid.UUID = Depends(get_tenant_id),
):
    vaccination = Vaccination(
        tenant_id=tenant_id,
        administered_by=current_user.id,
        **data.model_dump(),
    )
    db.add(vaccination)
    await db.flush()
    await db.refresh(vaccination)
    return vaccination


# --- Prescriptions ---
@router.get("/prescriptions/", response_model=list[PrescriptionResponse])
async def list_prescriptions(
    consultation_id: uuid.UUID | None = None,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_permission_dep("prescriptions:read")),
    tenant_id: uuid.UUID = Depends(get_tenant_id),
):
    query = select(Prescription).where(*tenant_filter(Prescription, tenant_id))
    if consultation_id:
        query = query.where(Prescription.consultation_id == consultation_id)
    result = await db.execute(query.order_by(Prescription.created_at.desc()))
    return result.scalars().all()


@router.post("/prescriptions/", response_model=PrescriptionResponse, status_code=status.HTTP_201_CREATED)
async def create_prescription(
    data: PrescriptionCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_permission_dep("prescriptions:write")),
    tenant_id: uuid.UUID = Depends(get_tenant_id),
):
    prescription = Prescription(tenant_id=tenant_id, **data.model_dump())
    db.add(prescription)
    await db.flush()
    await db.refresh(prescription)
    return prescription


# --- Lab Results ---
@router.get("/lab-results/", response_model=list[LabResultResponse])
async def list_lab_results(
    patient_id: uuid.UUID | None = None,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_permission_dep("lab_results:read")),
    tenant_id: uuid.UUID = Depends(get_tenant_id),
):
    query = select(LabResult).where(*tenant_filter(LabResult, tenant_id))
    if patient_id:
        query = query.where(LabResult.patient_id == patient_id)
    result = await db.execute(query.order_by(LabResult.created_at.desc()))
    return result.scalars().all()


@router.post("/lab-results/", response_model=LabResultResponse, status_code=status.HTTP_201_CREATED)
async def create_lab_result(
    data: LabResultCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_permission_dep("lab_results:write")),
    tenant_id: uuid.UUID = Depends(get_tenant_id),
):
    lab_result = LabResult(tenant_id=tenant_id, **data.model_dump())
    db.add(lab_result)
    await db.flush()
    await db.refresh(lab_result)
    return lab_result
