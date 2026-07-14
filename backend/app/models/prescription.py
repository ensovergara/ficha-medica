import uuid

from sqlalchemy import ForeignKey, String, Text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base, TenantMixin, TimestampMixin


class Prescription(Base, TenantMixin, TimestampMixin):
    __tablename__ = "prescriptions"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    tenant_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("tenants.id"), nullable=False, index=True
    )
    consultation_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("consultations.id"), nullable=False
    )
    medication: Mapped[str] = mapped_column(String(200), nullable=False)
    dosage: Mapped[str | None] = mapped_column(String(100), nullable=True)
    frequency: Mapped[str | None] = mapped_column(String(100), nullable=True)
    duration: Mapped[str | None] = mapped_column(String(100), nullable=True)
    notes: Mapped[str | None] = mapped_column(Text, nullable=True)
    # FHIR MedicationRequest fields
    # status: active | on-hold | cancelled | completed | entered-in-error | stopped | draft | unknown
    fhir_status: Mapped[str] = mapped_column(String(20), default="active", server_default="active")
    # intent: proposal | plan | order | original-order | reflex-order | filler-order | instance-order | option
    intent: Mapped[str] = mapped_column(String(20), default="order", server_default="order")
    # RxNorm or SNOMED code for the medication
    medication_code: Mapped[str | None] = mapped_column(String(50), nullable=True)
    medication_system: Mapped[str | None] = mapped_column(String(200), nullable=True)

    consultation = relationship("Consultation", back_populates="prescriptions", lazy="selectin")
