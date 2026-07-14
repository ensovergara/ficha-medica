import uuid
import datetime as dt

from pydantic import BaseModel


class MedicalRecordCreate(BaseModel):
    patient_id: uuid.UUID
    record_number: str | None = None
    notes: str | None = None
    # FHIR EpisodeOfCare.status: planned | waitlist | active | onhold | finished | cancelled | entered-in-error
    fhir_status: str = "active"


class MedicalRecordResponse(BaseModel):
    id: uuid.UUID
    tenant_id: uuid.UUID
    patient_id: uuid.UUID
    record_number: str | None
    notes: str | None
    fhir_status: str
    created_at: dt.datetime

    model_config = {"from_attributes": True}


class ConsultationCreate(BaseModel):
    medical_record_id: uuid.UUID
    reason: str | None = None
    diagnosis: str | None = None
    treatment: str | None = None
    notes: str | None = None
    weight_at_visit: float | None = None
    temperature: float | None = None
    # FHIR Encounter fields
    fhir_status: str = "finished"
    encounter_class: str = "AMB"
    period_start: dt.datetime | None = None
    period_end: dt.datetime | None = None


class ConsultationResponse(BaseModel):
    id: uuid.UUID
    tenant_id: uuid.UUID
    medical_record_id: uuid.UUID
    veterinarian_id: uuid.UUID
    reason: str | None
    diagnosis: str | None
    treatment: str | None
    notes: str | None
    weight_at_visit: float | None
    temperature: float | None
    fhir_status: str
    encounter_class: str
    period_start: dt.datetime | None
    period_end: dt.datetime | None
    created_at: dt.datetime

    model_config = {"from_attributes": True}


class VaccinationCreate(BaseModel):
    patient_id: uuid.UUID
    vaccine_name: str
    batch_number: str | None = None
    next_dose_date: dt.date | None = None
    # FHIR Immunization fields
    fhir_status: str = "completed"
    occurrence_date: dt.datetime | None = None
    vaccine_code: str | None = None
    vaccine_system: str | None = None
    expiration_date: dt.date | None = None


class VaccinationResponse(BaseModel):
    id: uuid.UUID
    tenant_id: uuid.UUID
    patient_id: uuid.UUID
    vaccine_name: str
    batch_number: str | None
    administered_by: uuid.UUID
    next_dose_date: dt.date | None
    fhir_status: str
    occurrence_date: dt.datetime | None
    vaccine_code: str | None
    vaccine_system: str | None
    expiration_date: dt.date | None
    created_at: dt.datetime

    model_config = {"from_attributes": True}


class PrescriptionCreate(BaseModel):
    consultation_id: uuid.UUID
    medication: str
    dosage: str | None = None
    frequency: str | None = None
    duration: str | None = None
    notes: str | None = None
    # FHIR MedicationRequest fields
    fhir_status: str = "active"
    intent: str = "order"
    medication_code: str | None = None
    medication_system: str | None = None


class PrescriptionResponse(BaseModel):
    id: uuid.UUID
    tenant_id: uuid.UUID
    consultation_id: uuid.UUID
    medication: str
    dosage: str | None
    frequency: str | None
    duration: str | None
    notes: str | None
    fhir_status: str
    intent: str
    medication_code: str | None
    medication_system: str | None
    created_at: dt.datetime

    model_config = {"from_attributes": True}


class LabResultCreate(BaseModel):
    patient_id: uuid.UUID
    consultation_id: uuid.UUID | None = None
    test_type: str
    results: dict | None = None
    file_url: str | None = None
    # FHIR DiagnosticReport fields
    fhir_status: str = "final"
    report_code: str | None = None
    report_system: str | None = None
    conclusion: str | None = None


class LabResultResponse(BaseModel):
    id: uuid.UUID
    tenant_id: uuid.UUID
    patient_id: uuid.UUID
    consultation_id: uuid.UUID | None
    test_type: str
    results: dict | None
    file_url: str | None
    fhir_status: str
    report_code: str | None
    report_system: str | None
    conclusion: str | None
    created_at: dt.datetime

    model_config = {"from_attributes": True}
