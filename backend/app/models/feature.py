import uuid
from enum import Enum

from sqlalchemy import ForeignKey, String, UniqueConstraint
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base, TimestampMixin


class FeatureKey(str, Enum):
    BILLING = "billing"
    ANALYTICS = "analytics"
    TELEMEDICINE = "telemedicine"
    INVENTORY = "inventory"


class Feature(Base, TimestampMixin):
    __tablename__ = "features"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    key: Mapped[str] = mapped_column(String(50), unique=True, nullable=False, index=True)
    name: Mapped[str] = mapped_column(String(100), nullable=False)
    description: Mapped[str | None] = mapped_column(String(500), nullable=True)

    feature_plans = relationship("FeaturePlan", back_populates="feature", cascade="all, delete-orphan")


class FeaturePlan(Base, TimestampMixin):
    __tablename__ = "feature_plans"
    __table_args__ = (UniqueConstraint("plan_id", "feature_id", name="uq_plan_feature"),)

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    plan_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("plans.id"), nullable=False, index=True
    )
    feature_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("features.id"), nullable=False, index=True
    )

    plan = relationship("Plan", back_populates="feature_plans")
    feature = relationship("Feature", back_populates="feature_plans")


class FeatureAssignment(Base, TimestampMixin):
    __tablename__ = "feature_assignments"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    plan_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("plans.id"), nullable=False, index=True
    )
    feature_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("features.id"), nullable=False, index=True
    )
    assigned_by: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id"), nullable=True, index=True
    )

    plan = relationship("Plan")
    feature = relationship("Feature")
    assigned_by_user = relationship("User")
