"""
HL7 FHIR R4 REST API endpoints.

Base URL: /api/v1/fhir

Implemented endpoints:
  GET /fhir/Patient            → Bundle of Patient resources
  GET /fhir/Patient/{id}       → Patient resource
  GET /fhir/EpisodeOfCare/{id} → EpisodeOfCare resource
  GET /fhir/Encounter/{id}     → Encounter resource
  GET /fhir/Immunization       → Bundle of Immunization resources
  GET /fhir/Immunization/{id}  → Immunization resource
  GET /fhir/MedicationRequest  → Bundle of MedicationRequest resources
  GET /fhir/MedicationRequest/{id} → MedicationRequest resource
  GET /fhir/DiagnosticReport   → Bundle of DiagnosticReport resources
  GET /fhir/DiagnosticReport/{id}  → DiagnosticReport resource
  GET /fhir/metadata           → CapabilityStatement (server capabilities)

Content-Type: application/fhir+json
"""

from __future__ import annotations

import uuid
import datetime as dt
from typing import Any

from fastapi import APIRouter, Depends, HTTPException, Query, Response
from fastapi.responses import JSONResponse
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.dependencies import get_current_user, get_tenant_id, require_permission_dep, tenant_filter
from app.models.consultation import Consultation
from app.models.lab_result import LabResult
from app.models.medical_record import MedicalRecord
from app.models.patient import Patient
from app.models.prescription import Prescription
from app.models.vaccination import Vaccination
from app.models.user import User
from app.schemas.fhir import (
    FHIR_SYSTEM_ACT_CODE,
    FHIR_SYSTEM_ANIMAL_BREED,
    FHIR_SYSTEM_ANIMAL_SPECIES,
    FHIR_SYSTEM_CVX,
    FHIR_SYSTEM_LOINC,
    FHIR_SYSTEM_RXNORM,
    FHIR_SYSTEM_SNOMED,
    FHIR_SYSTEM_UUID,
    FHIRAnnotation,
    FHIRAttachment,
    FHIRBundle,
    FHIRBundleEntry,
    FHIRCodeableConcept,
    FHIRCoding,
    FHIRDiagnosticReport,
    FHIRDosageInstruction,
    FHIREpisodeOfCare,
    FHIRIdentifier,
    FHIRHumanName,
    FHIRImmunization,
    FHIRImmunizationPerformer,
    FHIRMedicationRequest,
    FHIRMeta,
    FHIRNarrative,
    FHIRPatient,
    FHIRPeriod,
    FHIRReference,
    FHIREncounter,
    FHIREncounterParticipant,
    FHIROperationOutcome,
    FHIROperationOutcomeIssue,
)

router = APIRouter(prefix="/fhir", tags=["FHIR R4"])

FHIR_CONTENT_TYPE = "application/fhir+json; charset=utf-8"

# FHIR server base URL — used to build fullUrl in Bundles
FHIR_BASE = "https://fichamed.pet/fhir"


def _fhir_response(data: Any, status_code: int = 200) -> JSONResponse:
    """Return a response with the FHIR content-type header."""
    if hasattr(data, "model_dump"):
        body = data.model_dump(exclude_none=True, by_alias=True)
    else:
        body = data
    return JSONResponse(content=body, status_code=status_code, media_type=FHIR_CONTENT_TYPE)


def _not_found(resource_type: str, resource_id: str) -> JSONResponse:
    outcome = FHIROperationOutcome(issue=[
        FHIROperationOutcomeIssue(
            severity="error",
            code="not-found",
            diagnostics=f"{resource_type}/{resource_id} not found",
        )
    ])
    return _fhir_response(outcome, status_code=404)


def _fhir_id(resource_id: uuid.UUID) -> str:
    return str(resource_id)


def _fhir_ref(resource_type: str, resource_id: uuid.UUID, display: str | None = None) -> FHIRReference:
    return FHIRReference(
        reference=f"{resource_type}/{resource_id}",
        type=resource_type,
        display=display,
    )


def _fhir_identifier(resource_id: uuid.UUID) -> FHIRIdentifier:
    return FHIRIdentifier(
        use="official",
        system=FHIR_SYSTEM_UUID,
        value=f"urn:uuid:{resource_id}",
    )


def _isodt(value: dt.datetime | dt.date | None) -> str | None:
    if value is None:
        return None
    if isinstance(value, dt.datetime):
        return value.isoformat()
    return value.isoformat()


# ---------------------------------------------------------------------------
# Mappers: DB model → FHIR resource
# ---------------------------------------------------------------------------

_SEX_TO_FHIR_GENDER = {
    "male": "male",
    "macho": "male",
    "m": "male",
    "female": "female",
    "hembra": "female",
    "f": "female",
    "castrado": "other",
    "esterilizada": "other",
    "other": "other",
    "otro": "other",
}


def patient_to_fhir(patient: Patient) -> FHIRPatient:
    """Map a Patient DB model to a FHIR R4 Patient resource."""
    gender_raw = (patient.sex or "").lower()
    fhir_gender = _SEX_TO_FHIR_GENDER.get(gender_raw, "unknown")

    # Animal extension — carries species and breed
    animal_extension_inner: list[dict[str, Any]] = [
        {
            "url": "species",
            "valueCodeableConcept": {
                "coding": [
                    {
                        "system": FHIR_SYSTEM_ANIMAL_SPECIES,
                        "code": patient.species.lower(),
                        "display": patient.species,
                    }
                ],
                "text": patient.species,
            },
        }
    ]
    if patient.breed:
        animal_extension_inner.append(
            {
                "url": "breed",
                "valueCodeableConcept": {
                    "coding": [
                        {
                            "system": FHIR_SYSTEM_ANIMAL_BREED,
                            "code": patient.breed.lower().replace(" ", "-"),
                            "display": patient.breed,
                        }
                    ],
                    "text": patient.breed,
                },
            }
        )

    extensions: list[dict[str, Any]] = [
        {
            "url": "http://hl7.org/fhir/StructureDefinition/patient-animal",
            "extension": animal_extension_inner,
        }
    ]

    # Microchip as additional identifier
    identifiers = [_fhir_identifier(patient.id)]
    if patient.microchip:
        identifiers.append(
            FHIRIdentifier(
                use="official",
                system="http://terminology.hl7.org/CodeSystem/v2-0203",  # microchip
                value=patient.microchip,
            )
        )

    narrative_div = (
        f'<div xmlns="http://www.w3.org/1999/xhtml">'
        f"<p><b>{patient.name}</b> — {patient.species}"
        f"{(' / ' + patient.breed) if patient.breed else ''}</p>"
        f"</div>"
    )

    owner_ref = _fhir_ref("RelatedPerson", patient.client_id, display="Owner")

    return FHIRPatient(
        id=_fhir_id(patient.id),
        meta=FHIRMeta(
            lastUpdated=_isodt(patient.updated_at),
            profile=["http://hl7.org/fhir/StructureDefinition/Patient"],
        ),
        text=FHIRNarrative(status="generated", div=narrative_div),
        identifier=identifiers,
        active=patient.is_active,
        name=[FHIRHumanName(use="official", text=patient.name, given=[patient.name])],
        gender=fhir_gender,
        birthDate=_isodt(patient.birth_date),
        extension=extensions,
        generalPractitioner=[owner_ref],
        managingOrganization=_fhir_ref("Organization", patient.tenant_id),
    )


def medical_record_to_fhir(record: MedicalRecord) -> FHIREpisodeOfCare:
    """Map a MedicalRecord DB model to a FHIR R4 EpisodeOfCare resource."""
    identifiers = [_fhir_identifier(record.id)]
    if record.record_number:
        identifiers.append(
            FHIRIdentifier(use="usual", system="urn:local:record-number", value=record.record_number)
        )

    notes = []
    if record.notes:
        notes.append(FHIRAnnotation(text=record.notes, time=_isodt(record.created_at)))

    narrative_div = (
        f'<div xmlns="http://www.w3.org/1999/xhtml">'
        f"<p>EpisodeOfCare for patient {record.patient_id}"
        f"{(' — #' + record.record_number) if record.record_number else ''}</p>"
        f"</div>"
    )

    return FHIREpisodeOfCare(
        id=_fhir_id(record.id),
        meta=FHIRMeta(
            lastUpdated=_isodt(record.updated_at),
            profile=["http://hl7.org/fhir/StructureDefinition/EpisodeOfCare"],
        ),
        text=FHIRNarrative(status="generated", div=narrative_div),
        identifier=identifiers,
        status=record.fhir_status,
        type=[
            FHIRCodeableConcept(
                coding=[
                    FHIRCoding(
                        system="http://terminology.hl7.org/CodeSystem/episodeofcare-type",
                        code="hacc",
                        display="Home and Community Care",
                    )
                ],
                text="Veterinary care",
            )
        ],
        patient=_fhir_ref("Patient", record.patient_id),
        managingOrganization=_fhir_ref("Organization", record.tenant_id),
        period=FHIRPeriod(start=_isodt(record.created_at)),
        note=notes,
    )


def consultation_to_fhir(consultation: Consultation) -> FHIREncounter:
    """Map a Consultation DB model to a FHIR R4 Encounter resource."""
    encounter_class = FHIRCoding(
        system=FHIR_SYSTEM_ACT_CODE,
        code=consultation.encounter_class or "AMB",
        display={
            "AMB": "ambulatory",
            "EMER": "emergency",
            "IMP": "inpatient encounter",
            "HH": "home health",
        }.get(consultation.encounter_class or "AMB", "ambulatory"),
    )

    period: FHIRPeriod | None = None
    if consultation.period_start or consultation.period_end:
        period = FHIRPeriod(
            start=_isodt(consultation.period_start),
            end=_isodt(consultation.period_end),
        )
    elif consultation.created_at:
        period = FHIRPeriod(start=_isodt(consultation.created_at))

    reason_codes = []
    if consultation.reason:
        reason_codes.append(
            FHIRCodeableConcept(
                coding=[FHIRCoding(system=FHIR_SYSTEM_SNOMED, display=consultation.reason)],
                text=consultation.reason,
            )
        )

    # Inline observations for vital signs (weight, temperature)
    observations: list[dict[str, Any]] = []
    if consultation.weight_at_visit is not None:
        observations.append({
            "resourceType": "Observation",
            "status": "final",
            "code": {
                "coding": [{"system": "http://loinc.org", "code": "29463-7", "display": "Body weight"}],
                "text": "Weight",
            },
            "subject": {"reference": f"Patient/{consultation.medical_record.patient_id}"}
            if hasattr(consultation, "medical_record") and consultation.medical_record else {},
            "encounter": {"reference": f"Encounter/{consultation.id}"},
            "valueQuantity": {
                "value": float(consultation.weight_at_visit),
                "unit": "kg",
                "system": "http://unitsofmeasure.org",
                "code": "kg",
            },
        })
    if consultation.temperature is not None:
        observations.append({
            "resourceType": "Observation",
            "status": "final",
            "code": {
                "coding": [{"system": "http://loinc.org", "code": "8310-5", "display": "Body temperature"}],
                "text": "Temperature",
            },
            "subject": {"reference": f"Patient/{consultation.medical_record.patient_id}"}
            if hasattr(consultation, "medical_record") and consultation.medical_record else {},
            "encounter": {"reference": f"Encounter/{consultation.id}"},
            "valueQuantity": {
                "value": float(consultation.temperature),
                "unit": "°C",
                "system": "http://unitsofmeasure.org",
                "code": "Cel",
            },
        })

    narrative_parts = [f"Consultation on {_isodt(consultation.created_at)}"]
    if consultation.reason:
        narrative_parts.append(f"Reason: {consultation.reason}")
    if consultation.diagnosis:
        narrative_parts.append(f"Diagnosis: {consultation.diagnosis}")

    narrative_div = (
        '<div xmlns="http://www.w3.org/1999/xhtml"><p>'
        + " | ".join(narrative_parts)
        + "</p></div>"
    )

    return FHIREncounter(
        id=_fhir_id(consultation.id),
        meta=FHIRMeta(
            lastUpdated=_isodt(consultation.updated_at),
            profile=["http://hl7.org/fhir/StructureDefinition/Encounter"],
        ),
        text=FHIRNarrative(status="generated", div=narrative_div),
        identifier=[_fhir_identifier(consultation.id)],
        status=consultation.fhir_status,
        **{"class": encounter_class},
        type=[
            FHIRCodeableConcept(
                coding=[
                    FHIRCoding(
                        system="http://snomed.info/sct",
                        code="11429006",
                        display="Consultation",
                    )
                ],
                text="Veterinary consultation",
            )
        ],
        subject=_fhir_ref(
            "Patient",
            consultation.medical_record.patient_id
            if hasattr(consultation, "medical_record") and consultation.medical_record
            else consultation.medical_record_id,
        ),
        episodeOfCare=[_fhir_ref("EpisodeOfCare", consultation.medical_record_id)],
        participant=[
            FHIREncounterParticipant(
                type=[
                    FHIRCodeableConcept(
                        coding=[
                            FHIRCoding(
                                system="http://terminology.hl7.org/CodeSystem/v3-ParticipationType",
                                code="ATND",
                                display="attender",
                            )
                        ]
                    )
                ],
                individual=_fhir_ref("Practitioner", consultation.veterinarian_id),
            )
        ],
        period=period,
        reasonCode=reason_codes,
        observation=observations,
    )


def vaccination_to_fhir(vaccination: Vaccination) -> FHIRImmunization:
    """Map a Vaccination DB model to a FHIR R4 Immunization resource."""
    # Vaccine code: prefer explicit code, fall back to text
    vaccine_codings = []
    if vaccination.vaccine_code:
        vaccine_codings.append(
            FHIRCoding(
                system=vaccination.vaccine_system or FHIR_SYSTEM_CVX,
                code=vaccination.vaccine_code,
                display=vaccination.vaccine_name,
            )
        )
    else:
        vaccine_codings.append(
            FHIRCoding(system=FHIR_SYSTEM_CVX, display=vaccination.vaccine_name)
        )

    occurrence = _isodt(vaccination.occurrence_date or vaccination.created_at) or dt.datetime.utcnow().isoformat()

    performer = [
        FHIRImmunizationPerformer(
            function=FHIRCodeableConcept(
                coding=[
                    FHIRCoding(
                        system="http://terminology.hl7.org/CodeSystem/v2-0443",
                        code="AP",
                        display="Administering Provider",
                    )
                ]
            ),
            actor=_fhir_ref("Practitioner", vaccination.administered_by),
        )
    ]

    narrative_div = (
        f'<div xmlns="http://www.w3.org/1999/xhtml">'
        f"<p>{vaccination.vaccine_name} administered on {occurrence}</p>"
        f"</div>"
    )

    return FHIRImmunization(
        id=_fhir_id(vaccination.id),
        meta=FHIRMeta(
            lastUpdated=_isodt(vaccination.updated_at),
            profile=["http://hl7.org/fhir/StructureDefinition/Immunization"],
        ),
        text=FHIRNarrative(status="generated", div=narrative_div),
        identifier=[_fhir_identifier(vaccination.id)],
        status=vaccination.fhir_status,
        vaccineCode=FHIRCodeableConcept(coding=vaccine_codings, text=vaccination.vaccine_name),
        patient=_fhir_ref("Patient", vaccination.patient_id),
        occurrenceDateTime=occurrence,
        lotNumber=vaccination.batch_number,
        expirationDate=_isodt(vaccination.expiration_date),
        performer=performer,
    )


def prescription_to_fhir(prescription: Prescription, patient_id: uuid.UUID | None = None) -> FHIRMedicationRequest:
    """Map a Prescription DB model to a FHIR R4 MedicationRequest resource."""
    med_codings = []
    if prescription.medication_code:
        med_codings.append(
            FHIRCoding(
                system=prescription.medication_system or FHIR_SYSTEM_RXNORM,
                code=prescription.medication_code,
                display=prescription.medication,
            )
        )
    else:
        med_codings.append(FHIRCoding(system=FHIR_SYSTEM_RXNORM, display=prescription.medication))

    dosage_instructions = []
    dosage_text_parts = []
    if prescription.dosage:
        dosage_text_parts.append(prescription.dosage)
    if prescription.frequency:
        dosage_text_parts.append(prescription.frequency)
    if prescription.duration:
        dosage_text_parts.append(f"for {prescription.duration}")
    if dosage_text_parts:
        dosage_instructions.append(FHIRDosageInstruction(text=" — ".join(dosage_text_parts)))

    notes = []
    if prescription.notes:
        notes.append(FHIRAnnotation(text=prescription.notes))

    narrative_div = (
        f'<div xmlns="http://www.w3.org/1999/xhtml">'
        f"<p>{prescription.medication}"
        + (f" — {', '.join(dosage_text_parts)}" if dosage_text_parts else "")
        + "</p></div>"
    )

    subject_id = patient_id or prescription.consultation_id  # fallback if patient not loaded
    return FHIRMedicationRequest(
        id=_fhir_id(prescription.id),
        meta=FHIRMeta(
            lastUpdated=_isodt(prescription.updated_at),
            profile=["http://hl7.org/fhir/StructureDefinition/MedicationRequest"],
        ),
        text=FHIRNarrative(status="generated", div=narrative_div),
        identifier=[_fhir_identifier(prescription.id)],
        status=prescription.fhir_status,
        intent=prescription.intent,
        medicationCodeableConcept=FHIRCodeableConcept(coding=med_codings, text=prescription.medication),
        subject=_fhir_ref("Patient", subject_id),
        encounter=_fhir_ref("Encounter", prescription.consultation_id),
        authoredOn=_isodt(prescription.created_at),
        dosageInstruction=dosage_instructions,
        note=notes,
    )


def lab_result_to_fhir(lab: LabResult) -> FHIRDiagnosticReport:
    """Map a LabResult DB model to a FHIR R4 DiagnosticReport resource."""
    report_codings = []
    if lab.report_code:
        report_codings.append(
            FHIRCoding(
                system=lab.report_system or FHIR_SYSTEM_LOINC,
                code=lab.report_code,
                display=lab.test_type,
            )
        )
    else:
        report_codings.append(FHIRCoding(system=FHIR_SYSTEM_LOINC, display=lab.test_type))

    presented_forms = []
    if lab.file_url:
        presented_forms.append(FHIRAttachment(url=lab.file_url, title=lab.test_type))

    narrative_div = (
        f'<div xmlns="http://www.w3.org/1999/xhtml">'
        f"<p>DiagnosticReport: {lab.test_type}</p>"
        + (f"<p>{lab.conclusion}</p>" if lab.conclusion else "")
        + "</div>"
    )

    return FHIRDiagnosticReport(
        id=_fhir_id(lab.id),
        meta=FHIRMeta(
            lastUpdated=_isodt(lab.updated_at),
            profile=["http://hl7.org/fhir/StructureDefinition/DiagnosticReport"],
        ),
        text=FHIRNarrative(status="generated", div=narrative_div),
        identifier=[_fhir_identifier(lab.id)],
        status=lab.fhir_status,
        category=[
            FHIRCodeableConcept(
                coding=[
                    FHIRCoding(
                        system="http://terminology.hl7.org/CodeSystem/v2-0074",
                        code="LAB",
                        display="Laboratory",
                    )
                ]
            )
        ],
        code=FHIRCodeableConcept(coding=report_codings, text=lab.test_type),
        subject=_fhir_ref("Patient", lab.patient_id),
        encounter=_fhir_ref("Encounter", lab.consultation_id) if lab.consultation_id else None,
        issued=_isodt(lab.created_at),
        presentedForm=presented_forms,
        conclusion=lab.conclusion,
    )


# ---------------------------------------------------------------------------
# Endpoints
# ---------------------------------------------------------------------------

# --- metadata (CapabilityStatement) ---

@router.get("/metadata", summary="FHIR CapabilityStatement")
async def fhir_metadata() -> JSONResponse:
    """Return a minimal FHIR R4 CapabilityStatement describing this server."""
    capability = {
        "resourceType": "CapabilityStatement",
        "status": "active",
        "date": dt.date.today().isoformat(),
        "kind": "instance",
        "fhirVersion": "4.0.1",
        "format": ["application/fhir+json"],
        "implementationGuide": [],
        "rest": [
            {
                "mode": "server",
                "resource": [
                    {"type": "Patient",            "interaction": [{"code": "read"}, {"code": "search-type"}]},
                    {"type": "EpisodeOfCare",       "interaction": [{"code": "read"}]},
                    {"type": "Encounter",            "interaction": [{"code": "read"}, {"code": "search-type"}]},
                    {"type": "Immunization",         "interaction": [{"code": "read"}, {"code": "search-type"}]},
                    {"type": "MedicationRequest",    "interaction": [{"code": "read"}, {"code": "search-type"}]},
                    {"type": "DiagnosticReport",     "interaction": [{"code": "read"}, {"code": "search-type"}]},
                ],
            }
        ],
    }
    return JSONResponse(content=capability, media_type=FHIR_CONTENT_TYPE)


# --- Patient ---

@router.get("/Patient", summary="Search Patient resources")
async def fhir_search_patients(
    _id: uuid.UUID | None = Query(None, alias="_id"),
    name: str | None = Query(None),
    species: str | None = Query(None),
    _count: int = Query(50, alias="_count", ge=1, le=200),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_permission_dep("patients:read")),
    tenant_id: uuid.UUID = Depends(get_tenant_id),
) -> JSONResponse:
    query = select(Patient).where(*tenant_filter(Patient, tenant_id), Patient.is_active == True)
    if _id:
        query = query.where(Patient.id == _id)
    if name:
        query = query.where(Patient.name.ilike(f"%{name}%"))
    if species:
        query = query.where(Patient.species.ilike(f"%{species}%"))
    result = await db.execute(query.order_by(Patient.created_at.desc()).limit(_count))
    patients = result.scalars().all()

    entries = [
        FHIRBundleEntry(
            fullUrl=f"{FHIR_BASE}/Patient/{p.id}",
            resource=patient_to_fhir(p).model_dump(exclude_none=True, by_alias=True),
        )
        for p in patients
    ]
    bundle = FHIRBundle(type="searchset", total=len(entries), entry=entries)
    return _fhir_response(bundle)


@router.get("/Patient/{patient_id}", summary="Read Patient resource")
async def fhir_get_patient(
    patient_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_permission_dep("patients:read")),
    tenant_id: uuid.UUID = Depends(get_tenant_id),
) -> JSONResponse:
    result = await db.execute(
        select(Patient).where(Patient.id == patient_id, *tenant_filter(Patient, tenant_id))
    )
    patient = result.scalar_one_or_none()
    if not patient:
        return _not_found("Patient", str(patient_id))
    return _fhir_response(patient_to_fhir(patient))


# --- EpisodeOfCare ---

@router.get("/EpisodeOfCare/{record_id}", summary="Read EpisodeOfCare resource (MedicalRecord)")
async def fhir_get_episode_of_care(
    record_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_permission_dep("medical_records:read")),
    tenant_id: uuid.UUID = Depends(get_tenant_id),
) -> JSONResponse:
    result = await db.execute(
        select(MedicalRecord).where(MedicalRecord.id == record_id, *tenant_filter(MedicalRecord, tenant_id))
    )
    record = result.scalar_one_or_none()
    if not record:
        return _not_found("EpisodeOfCare", str(record_id))
    return _fhir_response(medical_record_to_fhir(record))


# --- Encounter ---

@router.get("/Encounter", summary="Search Encounter resources (Consultations)")
async def fhir_search_encounters(
    patient: uuid.UUID | None = Query(None),
    episode_of_care: uuid.UUID | None = Query(None, alias="episode-of-care"),
    _count: int = Query(50, alias="_count", ge=1, le=200),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_permission_dep("consultations:read")),
    tenant_id: uuid.UUID = Depends(get_tenant_id),
) -> JSONResponse:
    query = select(Consultation).where(*tenant_filter(Consultation, tenant_id))
    if episode_of_care:
        query = query.where(Consultation.medical_record_id == episode_of_care)
    result = await db.execute(query.order_by(Consultation.created_at.desc()).limit(_count))
    consultations = result.scalars().all()

    # filter by patient if requested (requires joining through medical_record)
    if patient:
        mr_result = await db.execute(
            select(MedicalRecord.id).where(
                MedicalRecord.patient_id == patient,
                *tenant_filter(MedicalRecord, tenant_id),
            )
        )
        mr_ids = {row[0] for row in mr_result.fetchall()}
        consultations = [c for c in consultations if c.medical_record_id in mr_ids]

    entries = [
        FHIRBundleEntry(
            fullUrl=f"{FHIR_BASE}/Encounter/{c.id}",
            resource=consultation_to_fhir(c).model_dump(exclude_none=True, by_alias=True),
        )
        for c in consultations
    ]
    bundle = FHIRBundle(type="searchset", total=len(entries), entry=entries)
    return _fhir_response(bundle)


@router.get("/Encounter/{consultation_id}", summary="Read Encounter resource (Consultation)")
async def fhir_get_encounter(
    consultation_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_permission_dep("consultations:read")),
    tenant_id: uuid.UUID = Depends(get_tenant_id),
) -> JSONResponse:
    result = await db.execute(
        select(Consultation).where(Consultation.id == consultation_id, *tenant_filter(Consultation, tenant_id))
    )
    consultation = result.scalar_one_or_none()
    if not consultation:
        return _not_found("Encounter", str(consultation_id))
    return _fhir_response(consultation_to_fhir(consultation))


# --- Immunization ---

@router.get("/Immunization", summary="Search Immunization resources (Vaccinations)")
async def fhir_search_immunizations(
    patient: uuid.UUID | None = Query(None),
    _count: int = Query(50, alias="_count", ge=1, le=200),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_permission_dep("vaccinations:read")),
    tenant_id: uuid.UUID = Depends(get_tenant_id),
) -> JSONResponse:
    query = select(Vaccination).where(*tenant_filter(Vaccination, tenant_id))
    if patient:
        query = query.where(Vaccination.patient_id == patient)
    result = await db.execute(query.order_by(Vaccination.created_at.desc()).limit(_count))
    vaccinations = result.scalars().all()

    entries = [
        FHIRBundleEntry(
            fullUrl=f"{FHIR_BASE}/Immunization/{v.id}",
            resource=vaccination_to_fhir(v).model_dump(exclude_none=True, by_alias=True),
        )
        for v in vaccinations
    ]
    bundle = FHIRBundle(type="searchset", total=len(entries), entry=entries)
    return _fhir_response(bundle)


@router.get("/Immunization/{vaccination_id}", summary="Read Immunization resource (Vaccination)")
async def fhir_get_immunization(
    vaccination_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_permission_dep("vaccinations:read")),
    tenant_id: uuid.UUID = Depends(get_tenant_id),
) -> JSONResponse:
    result = await db.execute(
        select(Vaccination).where(Vaccination.id == vaccination_id, *tenant_filter(Vaccination, tenant_id))
    )
    vaccination = result.scalar_one_or_none()
    if not vaccination:
        return _not_found("Immunization", str(vaccination_id))
    return _fhir_response(vaccination_to_fhir(vaccination))


# --- MedicationRequest ---

@router.get("/MedicationRequest", summary="Search MedicationRequest resources (Prescriptions)")
async def fhir_search_medication_requests(
    patient: uuid.UUID | None = Query(None),
    encounter: uuid.UUID | None = Query(None),
    _count: int = Query(50, alias="_count", ge=1, le=200),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_permission_dep("prescriptions:read")),
    tenant_id: uuid.UUID = Depends(get_tenant_id),
) -> JSONResponse:
    query = select(Prescription).where(*tenant_filter(Prescription, tenant_id))
    if encounter:
        query = query.where(Prescription.consultation_id == encounter)
    result = await db.execute(query.order_by(Prescription.created_at.desc()).limit(_count))
    prescriptions = result.scalars().all()

    # resolve patient ids via consultation → medical_record → patient
    patient_map: dict[uuid.UUID, uuid.UUID] = {}
    if prescriptions:
        consultation_ids = list({p.consultation_id for p in prescriptions})
        mr_result = await db.execute(
            select(Consultation.id, MedicalRecord.patient_id)
            .join(MedicalRecord, Consultation.medical_record_id == MedicalRecord.id)
            .where(Consultation.id.in_(consultation_ids))
        )
        for row in mr_result.fetchall():
            patient_map[row[0]] = row[1]

    # filter by patient if requested
    if patient:
        prescriptions = [p for p in prescriptions if patient_map.get(p.consultation_id) == patient]

    entries = [
        FHIRBundleEntry(
            fullUrl=f"{FHIR_BASE}/MedicationRequest/{p.id}",
            resource=prescription_to_fhir(
                p, patient_id=patient_map.get(p.consultation_id)
            ).model_dump(exclude_none=True, by_alias=True),
        )
        for p in prescriptions
    ]
    bundle = FHIRBundle(type="searchset", total=len(entries), entry=entries)
    return _fhir_response(bundle)


@router.get("/MedicationRequest/{prescription_id}", summary="Read MedicationRequest resource (Prescription)")
async def fhir_get_medication_request(
    prescription_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_permission_dep("prescriptions:read")),
    tenant_id: uuid.UUID = Depends(get_tenant_id),
) -> JSONResponse:
    result = await db.execute(
        select(Prescription).where(Prescription.id == prescription_id, *tenant_filter(Prescription, tenant_id))
    )
    prescription = result.scalar_one_or_none()
    if not prescription:
        return _not_found("MedicationRequest", str(prescription_id))

    # resolve patient id
    mr_result = await db.execute(
        select(MedicalRecord.patient_id)
        .join(Consultation, MedicalRecord.id == Consultation.medical_record_id)
        .where(Consultation.id == prescription.consultation_id)
    )
    row = mr_result.first()
    patient_id = row[0] if row else None

    return _fhir_response(prescription_to_fhir(prescription, patient_id=patient_id))


# --- DiagnosticReport ---

@router.get("/DiagnosticReport", summary="Search DiagnosticReport resources (Lab Results)")
async def fhir_search_diagnostic_reports(
    patient: uuid.UUID | None = Query(None),
    encounter: uuid.UUID | None = Query(None),
    _count: int = Query(50, alias="_count", ge=1, le=200),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_permission_dep("lab_results:read")),
    tenant_id: uuid.UUID = Depends(get_tenant_id),
) -> JSONResponse:
    query = select(LabResult).where(*tenant_filter(LabResult, tenant_id))
    if patient:
        query = query.where(LabResult.patient_id == patient)
    if encounter:
        query = query.where(LabResult.consultation_id == encounter)
    result = await db.execute(query.order_by(LabResult.created_at.desc()).limit(_count))
    lab_results = result.scalars().all()

    entries = [
        FHIRBundleEntry(
            fullUrl=f"{FHIR_BASE}/DiagnosticReport/{lr.id}",
            resource=lab_result_to_fhir(lr).model_dump(exclude_none=True, by_alias=True),
        )
        for lr in lab_results
    ]
    bundle = FHIRBundle(type="searchset", total=len(entries), entry=entries)
    return _fhir_response(bundle)


@router.get("/DiagnosticReport/{lab_result_id}", summary="Read DiagnosticReport resource (Lab Result)")
async def fhir_get_diagnostic_report(
    lab_result_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_permission_dep("lab_results:read")),
    tenant_id: uuid.UUID = Depends(get_tenant_id),
) -> JSONResponse:
    result = await db.execute(
        select(LabResult).where(LabResult.id == lab_result_id, *tenant_filter(LabResult, tenant_id))
    )
    lab = result.scalar_one_or_none()
    if not lab:
        return _not_found("DiagnosticReport", str(lab_result_id))
    return _fhir_response(lab_result_to_fhir(lab))

