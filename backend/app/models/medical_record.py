import uuid

from sqlalchemy import ForeignKey, String, Text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base, TenantMixin, TimestampMixin


class MedicalRecord(Base, TenantMixin, TimestampMixin):
    __tablename__ = "medical_records"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    tenant_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("tenants.id"), nullable=False, index=True
    )
    patient_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("patients.id"), nullable=False
    )
    record_number: Mapped[str | None] = mapped_column(String(50), nullable=True)
    notes: Mapped[str | None] = mapped_column(Text, nullable=True)
    # FHIR EpisodeOfCare.status: planned | waitlist | active | onhold | finished | cancelled | entered-in-error
    fhir_status: Mapped[str] = mapped_column(String(30), default="active", server_default="active")

    patient = relationship("Patient", back_populates="medical_records", lazy="selectin")
    consultations = relationship("Consultation", back_populates="medical_record", lazy="selectin")
