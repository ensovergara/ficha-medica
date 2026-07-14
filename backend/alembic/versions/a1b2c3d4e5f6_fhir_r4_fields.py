"""fhir_r4_fields

Revision ID: a1b2c3d4e5f6
Revises: dcfffe946566
Create Date: 2026-04-07 00:00:00.000000

Add HL7 FHIR R4 status and coding fields to medical entities.
"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "a1b2c3d4e5f6"
down_revision: Union[str, None] = "dcfffe946566"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # medical_records — FHIR EpisodeOfCare.status
    op.add_column(
        "medical_records",
        sa.Column("fhir_status", sa.String(30), nullable=False, server_default="active"),
    )

    # consultations — FHIR Encounter fields
    op.add_column(
        "consultations",
        sa.Column("fhir_status", sa.String(30), nullable=False, server_default="finished"),
    )
    op.add_column(
        "consultations",
        sa.Column("encounter_class", sa.String(10), nullable=False, server_default="AMB"),
    )
    op.add_column(
        "consultations",
        sa.Column("period_start", sa.DateTime(timezone=True), nullable=True),
    )
    op.add_column(
        "consultations",
        sa.Column("period_end", sa.DateTime(timezone=True), nullable=True),
    )

    # vaccinations — FHIR Immunization fields
    op.add_column(
        "vaccinations",
        sa.Column("fhir_status", sa.String(20), nullable=False, server_default="completed"),
    )
    op.add_column(
        "vaccinations",
        sa.Column("occurrence_date", sa.DateTime(timezone=True), nullable=True),
    )
    op.add_column(
        "vaccinations",
        sa.Column("vaccine_code", sa.String(50), nullable=True),
    )
    op.add_column(
        "vaccinations",
        sa.Column("vaccine_system", sa.String(200), nullable=True),
    )
    op.add_column(
        "vaccinations",
        sa.Column("expiration_date", sa.Date(), nullable=True),
    )

    # prescriptions — FHIR MedicationRequest fields
    op.add_column(
        "prescriptions",
        sa.Column("fhir_status", sa.String(20), nullable=False, server_default="active"),
    )
    op.add_column(
        "prescriptions",
        sa.Column("intent", sa.String(20), nullable=False, server_default="order"),
    )
    op.add_column(
        "prescriptions",
        sa.Column("medication_code", sa.String(50), nullable=True),
    )
    op.add_column(
        "prescriptions",
        sa.Column("medication_system", sa.String(200), nullable=True),
    )

    # lab_results — FHIR DiagnosticReport fields
    op.add_column(
        "lab_results",
        sa.Column("fhir_status", sa.String(20), nullable=False, server_default="final"),
    )
    op.add_column(
        "lab_results",
        sa.Column("report_code", sa.String(50), nullable=True),
    )
    op.add_column(
        "lab_results",
        sa.Column("report_system", sa.String(200), nullable=True),
    )
    op.add_column(
        "lab_results",
        sa.Column("conclusion", sa.Text(), nullable=True),
    )


def downgrade() -> None:
    op.drop_column("lab_results", "conclusion")
    op.drop_column("lab_results", "report_system")
    op.drop_column("lab_results", "report_code")
    op.drop_column("lab_results", "fhir_status")

    op.drop_column("prescriptions", "medication_system")
    op.drop_column("prescriptions", "medication_code")
    op.drop_column("prescriptions", "intent")
    op.drop_column("prescriptions", "fhir_status")

    op.drop_column("vaccinations", "expiration_date")
    op.drop_column("vaccinations", "vaccine_system")
    op.drop_column("vaccinations", "vaccine_code")
    op.drop_column("vaccinations", "occurrence_date")
    op.drop_column("vaccinations", "fhir_status")

    op.drop_column("consultations", "period_end")
    op.drop_column("consultations", "period_start")
    op.drop_column("consultations", "encounter_class")
    op.drop_column("consultations", "fhir_status")

    op.drop_column("medical_records", "fhir_status")
