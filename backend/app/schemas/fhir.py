"""
HL7 FHIR R4 schemas for veterinary patient records.

Resources implemented:
  - Patient       (animal patient)
  - EpisodeOfCare (medical record / ficha médica)
  - Encounter     (consultation / consulta)
  - Immunization  (vaccination / vacuna)
  - MedicationRequest (prescription / receta)
  - DiagnosticReport  (lab result / resultado de laboratorio)
  - Bundle        (collection of resources)

Terminology systems used:
  - Species / breeds : http://snomed.info/sct
  - Gender          : http://hl7.org/fhir/administrative-gender
  - Encounter class : http://terminology.hl7.org/CodeSystem/v3-ActCode
  - Vaccine codes   : http://hl7.org/fhir/sid/cvx
  - Medications     : http://www.nlm.nih.gov/research/umls/rxnorm
  - Lab codes       : http://loinc.org
  - Internal IDs    : urn:ietf:rfc:3986 (UUIDs as URNs)
"""

from __future__ import annotations

import uuid
import datetime as dt
from typing import Any, Literal

from pydantic import BaseModel, Field


# ---------------------------------------------------------------------------
# Primitive FHIR types
# ---------------------------------------------------------------------------

class FHIRMeta(BaseModel):
    versionId: str | None = None
    lastUpdated: str | None = None
    profile: list[str] = []


class FHIRCoding(BaseModel):
    system: str | None = None
    version: str | None = None
    code: str | None = None
    display: str | None = None


class FHIRCodeableConcept(BaseModel):
    coding: list[FHIRCoding] = []
    text: str | None = None


class FHIRReference(BaseModel):
    reference: str | None = None
    type: str | None = None
    display: str | None = None


class FHIRIdentifier(BaseModel):
    use: str | None = None          # usual | official | temp | secondary | old
    system: str | None = None
    value: str | None = None


class FHIRHumanName(BaseModel):
    use: str | None = None          # usual | official | temp | nickname | anonymous | old | maiden
    family: str | None = None
    given: list[str] = []
    text: str | None = None


class FHIRContactPoint(BaseModel):
    system: str | None = None       # phone | fax | email | pager | url | sms | other
    value: str | None = None
    use: str | None = None          # home | work | temp | old | mobile


class FHIRAddress(BaseModel):
    use: str | None = None
    text: str | None = None
    line: list[str] = []
    city: str | None = None
    state: str | None = None
    postalCode: str | None = None
    country: str | None = None


class FHIRPeriod(BaseModel):
    start: str | None = None        # ISO 8601 datetime
    end: str | None = None


class FHIRQuantity(BaseModel):
    value: float | None = None
    unit: str | None = None
    system: str | None = None       # usually http://unitsofmeasure.org
    code: str | None = None         # UCUM code e.g. "kg", "Cel"


class FHIRNarrative(BaseModel):
    status: str = "generated"       # generated | extensions | additional | empty
    div: str                        # XHTML content


class FHIRDosageInstruction(BaseModel):
    text: str | None = None
    timing: dict[str, Any] | None = None
    route: FHIRCodeableConcept | None = None
    doseAndRate: list[dict[str, Any]] = []


class FHIRAnnotation(BaseModel):
    authorString: str | None = None
    time: str | None = None
    text: str


# ---------------------------------------------------------------------------
# FHIR R4 — Patient (animal)
# https://www.hl7.org/fhir/patient.html
#
# Veterinary extension used:
#   http://hl7.org/fhir/StructureDefinition/patient-animal
# ---------------------------------------------------------------------------

FHIR_SYSTEM_ANIMAL_SPECIES = "http://hl7.org/fhir/animal-species"
FHIR_SYSTEM_ANIMAL_BREED   = "http://hl7.org/fhir/animal-breed"
FHIR_SYSTEM_GENDER         = "http://hl7.org/fhir/administrative-gender"
FHIR_SYSTEM_SNOMED         = "http://snomed.info/sct"
FHIR_SYSTEM_UUID           = "urn:ietf:rfc:3986"


class FHIRPatientAnimalExtension(BaseModel):
    """Extension: http://hl7.org/fhir/StructureDefinition/patient-animal"""
    url: str = "http://hl7.org/fhir/StructureDefinition/patient-animal"
    extension: list[dict[str, Any]] = []


class FHIRPatient(BaseModel):
    resourceType: Literal["Patient"] = "Patient"
    id: str
    meta: FHIRMeta = Field(default_factory=FHIRMeta)
    text: FHIRNarrative | None = None
    identifier: list[FHIRIdentifier] = []
    active: bool = True
    name: list[FHIRHumanName] = []
    # administrative gender mapped from sex field
    gender: str | None = None       # male | female | other | unknown
    birthDate: str | None = None    # YYYY-MM-DD
    # FHIR animal extension carrying species / breed
    extension: list[dict[str, Any]] = []
    generalPractitioner: list[FHIRReference] = []
    managingOrganization: FHIRReference | None = None
    link: list[dict[str, Any]] = []


# ---------------------------------------------------------------------------
# FHIR R4 — EpisodeOfCare  (MedicalRecord / Ficha médica)
# https://www.hl7.org/fhir/episodeofcare.html
# ---------------------------------------------------------------------------

class FHIREpisodeOfCare(BaseModel):
    resourceType: Literal["EpisodeOfCare"] = "EpisodeOfCare"
    id: str
    meta: FHIRMeta = Field(default_factory=FHIRMeta)
    text: FHIRNarrative | None = None
    identifier: list[FHIRIdentifier] = []
    # planned | waitlist | active | onhold | finished | cancelled | entered-in-error
    status: str = "active"
    type: list[FHIRCodeableConcept] = []
    patient: FHIRReference
    managingOrganization: FHIRReference | None = None
    period: FHIRPeriod | None = None
    note: list[FHIRAnnotation] = []


# ---------------------------------------------------------------------------
# FHIR R4 — Encounter  (Consultation / Consulta)
# https://www.hl7.org/fhir/encounter.html
# ---------------------------------------------------------------------------

FHIR_SYSTEM_ACT_CODE = "http://terminology.hl7.org/CodeSystem/v3-ActCode"


class FHIREncounterParticipant(BaseModel):
    type: list[FHIRCodeableConcept] = []
    individual: FHIRReference | None = None


class FHIREncounterDiagnosis(BaseModel):
    condition: FHIRReference
    use: FHIRCodeableConcept | None = None
    rank: int | None = None


class FHIREncounter(BaseModel):
    resourceType: Literal["Encounter"] = "Encounter"
    id: str
    meta: FHIRMeta = Field(default_factory=FHIRMeta)
    text: FHIRNarrative | None = None
    identifier: list[FHIRIdentifier] = []
    # planned | arrived | triaged | in-progress | onleave | finished | cancelled | entered-in-error | unknown
    status: str = "finished"
    # v3 ActCode: AMB | EMER | FLD | HH | IMP | ACUTE | NONAC | OBSENC | PRENC | SS | VR
    class_: FHIRCoding = Field(alias="class", default_factory=lambda: FHIRCoding(
        system=FHIR_SYSTEM_ACT_CODE, code="AMB", display="ambulatory"
    ))
    type: list[FHIRCodeableConcept] = []
    subject: FHIRReference
    episodeOfCare: list[FHIRReference] = []
    participant: list[FHIREncounterParticipant] = []
    period: FHIRPeriod | None = None
    reasonCode: list[FHIRCodeableConcept] = []
    diagnosis: list[FHIREncounterDiagnosis] = []
    # Observations within this encounter (weight, temperature)
    observation: list[dict[str, Any]] = []

    model_config = {"populate_by_name": True}


# ---------------------------------------------------------------------------
# FHIR R4 — Immunization  (Vaccination / Vacunación)
# https://www.hl7.org/fhir/immunization.html
# ---------------------------------------------------------------------------

FHIR_SYSTEM_CVX = "http://hl7.org/fhir/sid/cvx"


class FHIRImmunizationPerformer(BaseModel):
    function: FHIRCodeableConcept | None = None
    actor: FHIRReference


class FHIRImmunizationProtocol(BaseModel):
    series: str | None = None
    targetDisease: list[FHIRCodeableConcept] = []
    doseNumber: str | None = None


class FHIRImmunization(BaseModel):
    resourceType: Literal["Immunization"] = "Immunization"
    id: str
    meta: FHIRMeta = Field(default_factory=FHIRMeta)
    text: FHIRNarrative | None = None
    identifier: list[FHIRIdentifier] = []
    # completed | entered-in-error | not-done
    status: str = "completed"
    vaccineCode: FHIRCodeableConcept
    patient: FHIRReference
    occurrenceDateTime: str          # ISO 8601
    lotNumber: str | None = None
    expirationDate: str | None = None  # YYYY-MM-DD
    performer: list[FHIRImmunizationPerformer] = []
    protocolApplied: list[FHIRImmunizationProtocol] = []
    note: list[FHIRAnnotation] = []


# ---------------------------------------------------------------------------
# FHIR R4 — MedicationRequest  (Prescription / Receta)
# https://www.hl7.org/fhir/medicationrequest.html
# ---------------------------------------------------------------------------

FHIR_SYSTEM_RXNORM = "http://www.nlm.nih.gov/research/umls/rxnorm"


class FHIRMedicationRequest(BaseModel):
    resourceType: Literal["MedicationRequest"] = "MedicationRequest"
    id: str
    meta: FHIRMeta = Field(default_factory=FHIRMeta)
    text: FHIRNarrative | None = None
    identifier: list[FHIRIdentifier] = []
    # active | on-hold | cancelled | completed | entered-in-error | stopped | draft | unknown
    status: str = "active"
    # proposal | plan | order | original-order | reflex-order | filler-order | instance-order | option
    intent: str = "order"
    medicationCodeableConcept: FHIRCodeableConcept
    subject: FHIRReference
    encounter: FHIRReference | None = None
    authoredOn: str | None = None    # ISO 8601 datetime
    requester: FHIRReference | None = None
    dosageInstruction: list[FHIRDosageInstruction] = []
    dispenseRequest: dict[str, Any] | None = None
    note: list[FHIRAnnotation] = []


# ---------------------------------------------------------------------------
# FHIR R4 — DiagnosticReport  (LabResult / Resultado de laboratorio)
# https://www.hl7.org/fhir/diagnosticreport.html
# ---------------------------------------------------------------------------

FHIR_SYSTEM_LOINC = "http://loinc.org"


class FHIRAttachment(BaseModel):
    contentType: str | None = None
    url: str | None = None
    title: str | None = None


class FHIRDiagnosticReport(BaseModel):
    resourceType: Literal["DiagnosticReport"] = "DiagnosticReport"
    id: str
    meta: FHIRMeta = Field(default_factory=FHIRMeta)
    text: FHIRNarrative | None = None
    identifier: list[FHIRIdentifier] = []
    # registered | partial | preliminary | final | amended | corrected | appended | cancelled | entered-in-error | unknown
    status: str = "final"
    category: list[FHIRCodeableConcept] = []
    code: FHIRCodeableConcept
    subject: FHIRReference
    encounter: FHIRReference | None = None
    issued: str | None = None        # ISO 8601 instant
    performer: list[FHIRReference] = []
    result: list[FHIRReference] = []
    presentedForm: list[FHIRAttachment] = []
    conclusion: str | None = None
    conclusionCode: list[FHIRCodeableConcept] = []


# ---------------------------------------------------------------------------
# FHIR R4 — Bundle
# https://www.hl7.org/fhir/bundle.html
# ---------------------------------------------------------------------------

class FHIRBundleEntry(BaseModel):
    fullUrl: str | None = None
    resource: dict[str, Any]


class FHIRBundle(BaseModel):
    resourceType: Literal["Bundle"] = "Bundle"
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    meta: FHIRMeta = Field(default_factory=FHIRMeta)
    # document | message | transaction | transaction-response | batch | batch-response | history | searchset | collection
    type: str = "searchset"
    total: int | None = None
    entry: list[FHIRBundleEntry] = []


# ---------------------------------------------------------------------------
# FHIR R4 — OperationOutcome  (errors / validation responses)
# https://www.hl7.org/fhir/operationoutcome.html
# ---------------------------------------------------------------------------

class FHIROperationOutcomeIssue(BaseModel):
    severity: str                   # fatal | error | warning | information
    code: str                       # invalid | structure | required | value | ...
    details: FHIRCodeableConcept | None = None
    diagnostics: str | None = None
    location: list[str] = []
    expression: list[str] = []


class FHIROperationOutcome(BaseModel):
    resourceType: Literal["OperationOutcome"] = "OperationOutcome"
    issue: list[FHIROperationOutcomeIssue]
