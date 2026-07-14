import uuid

from sqlalchemy import ForeignKey, String, Text
from sqlalchemy.dialects.postgresql import JSON, UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.models.base import Base, TenantMixin, TimestampMixin


class LabResult(Base, TenantMixin, TimestampMixin):
    __tablename__ = "lab_results"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    tenant_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("tenants.id"), nullable=False, index=True
    )
    patient_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("patients.id"), nullable=False
    )
    consultation_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("consultations.id"), nullable=True
    )
    test_type: Mapped[str] = mapped_column(String(200), nullable=False)
    results: Mapped[dict | None] = mapped_column(JSON, nullable=True)
    file_url: Mapped[str | None] = mapped_column(Text, nullable=True)
    # FHIR DiagnosticReport fields
    # status: registered | partial | preliminary | final | amended | corrected | appended | cancelled | entered-in-error | unknown
    fhir_status: Mapped[str] = mapped_column(String(20), default="final", server_default="final")
    # LOINC code for the report type
    report_code: Mapped[str | None] = mapped_column(String(50), nullable=True)
    report_system: Mapped[str | None] = mapped_column(String(200), nullable=True)
    conclusion: Mapped[str | None] = mapped_column(Text, nullable=True)
