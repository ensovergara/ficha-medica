import uuid
from datetime import date, datetime

from sqlalchemy import Date, DateTime, ForeignKey, String
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base, TenantMixin, TimestampMixin


class Vaccination(Base, TenantMixin, TimestampMixin):
    __tablename__ = "vaccinations"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    tenant_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("tenants.id"), nullable=False, index=True
    )
    patient_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("patients.id"), nullable=False
    )
    vaccine_name: Mapped[str] = mapped_column(String(200), nullable=False)
    batch_number: Mapped[str | None] = mapped_column(String(100), nullable=True)
    administered_by: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id"), nullable=False
    )
    next_dose_date: Mapped[date | None] = mapped_column(Date, nullable=True)
    # FHIR Immunization fields
    # status: completed | entered-in-error | not-done
    fhir_status: Mapped[str] = mapped_column(String(20), default="completed", server_default="completed")
    occurrence_date: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    # CVX code or SNOMED CT code for the vaccine
    vaccine_code: Mapped[str | None] = mapped_column(String(50), nullable=True)
    vaccine_system: Mapped[str | None] = mapped_column(String(200), nullable=True)
    expiration_date: Mapped[date | None] = mapped_column(Date, nullable=True)

    patient = relationship("Patient", back_populates="vaccinations", lazy="selectin")
