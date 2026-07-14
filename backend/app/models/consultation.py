import uuid
from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, Numeric, String, Text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base, TenantMixin, TimestampMixin


class Consultation(Base, TenantMixin, TimestampMixin):
    __tablename__ = "consultations"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    tenant_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("tenants.id"), nullable=False, index=True
    )
    medical_record_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("medical_records.id"), nullable=False
    )
    veterinarian_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id"), nullable=False
    )
    reason: Mapped[str | None] = mapped_column(Text, nullable=True)
    diagnosis: Mapped[str | None] = mapped_column(Text, nullable=True)
    treatment: Mapped[str | None] = mapped_column(Text, nullable=True)
    notes: Mapped[str | None] = mapped_column(Text, nullable=True)
    weight_at_visit: Mapped[float | None] = mapped_column(Numeric(6, 2), nullable=True)
    temperature: Mapped[float | None] = mapped_column(Numeric(4, 1), nullable=True)
    # FHIR Encounter fields
    # status: planned | arrived | triaged | in-progress | onleave | finished | cancelled | entered-in-error | unknown
    fhir_status: Mapped[str] = mapped_column(String(30), default="finished", server_default="finished")
    # class: AMB (ambulatory) | EMER (emergency) | IMP (inpatient) | HH (home health)
    encounter_class: Mapped[str] = mapped_column(String(10), default="AMB", server_default="AMB")
    period_start: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    period_end: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)

    medical_record = relationship("MedicalRecord", back_populates="consultations", lazy="selectin")
    prescriptions = relationship("Prescription", back_populates="consultation", lazy="selectin")
