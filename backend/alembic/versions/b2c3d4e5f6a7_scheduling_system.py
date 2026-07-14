"""scheduling_system

Revision ID: b2c3d4e5f6a7
Revises: a1b2c3d4e5f6
Create Date: 2026-04-11 00:00:00.000000

Adds:
- services table
- veterinarian_services (M2M)
- veterinarian_schedules (weekly availability)
- schedule_exceptions (vacations / partial blocks)
- portal_magic_links (magic link auth for public portal)
- Appointment: service_id, source, guest_name, guest_phone columns

NOTE: Uses IF NOT EXISTS / ADD COLUMN IF NOT EXISTS so this migration is
idempotent in environments where create_all() already created the tables.
"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision: str = "b2c3d4e5f6a7"
down_revision: Union[str, None] = "a1b2c3d4e5f6"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    conn = op.get_bind()

    # ── services ──────────────────────────────────────────────────────────────
    conn.execute(sa.text("""
        CREATE TABLE IF NOT EXISTS services (
            id UUID PRIMARY KEY,
            tenant_id UUID NOT NULL REFERENCES tenants(id),
            name VARCHAR(100) NOT NULL,
            description TEXT,
            duration_minutes INTEGER NOT NULL DEFAULT 30,
            price NUMERIC(10,2),
            is_active BOOLEAN NOT NULL DEFAULT true,
            created_at TIMESTAMPTZ DEFAULT now(),
            updated_at TIMESTAMPTZ DEFAULT now()
        )
    """))
    conn.execute(sa.text("CREATE INDEX IF NOT EXISTS ix_services_tenant_id ON services(tenant_id)"))

    # ── veterinarian_services ─────────────────────────────────────────────────
    conn.execute(sa.text("""
        CREATE TABLE IF NOT EXISTS veterinarian_services (
            id UUID PRIMARY KEY,
            veterinarian_id UUID NOT NULL REFERENCES users(id),
            service_id UUID NOT NULL REFERENCES services(id),
            created_at TIMESTAMPTZ DEFAULT now(),
            updated_at TIMESTAMPTZ DEFAULT now(),
            CONSTRAINT uq_vet_service UNIQUE (veterinarian_id, service_id)
        )
    """))
    conn.execute(sa.text("CREATE INDEX IF NOT EXISTS ix_veterinarian_services_veterinarian_id ON veterinarian_services(veterinarian_id)"))
    conn.execute(sa.text("CREATE INDEX IF NOT EXISTS ix_veterinarian_services_service_id ON veterinarian_services(service_id)"))

    # ── veterinarian_schedules ────────────────────────────────────────────────
    conn.execute(sa.text("""
        CREATE TABLE IF NOT EXISTS veterinarian_schedules (
            id UUID PRIMARY KEY,
            tenant_id UUID NOT NULL REFERENCES tenants(id),
            veterinarian_id UUID NOT NULL REFERENCES users(id),
            day_of_week INTEGER NOT NULL,
            start_time TIME NOT NULL,
            end_time TIME NOT NULL,
            is_active BOOLEAN NOT NULL DEFAULT true,
            created_at TIMESTAMPTZ DEFAULT now(),
            updated_at TIMESTAMPTZ DEFAULT now()
        )
    """))
    conn.execute(sa.text("CREATE INDEX IF NOT EXISTS ix_veterinarian_schedules_tenant_id ON veterinarian_schedules(tenant_id)"))
    conn.execute(sa.text("CREATE INDEX IF NOT EXISTS ix_veterinarian_schedules_veterinarian_id ON veterinarian_schedules(veterinarian_id)"))

    # ── schedule_exceptions ───────────────────────────────────────────────────
    conn.execute(sa.text("""
        CREATE TABLE IF NOT EXISTS schedule_exceptions (
            id UUID PRIMARY KEY,
            tenant_id UUID NOT NULL REFERENCES tenants(id),
            veterinarian_id UUID NOT NULL REFERENCES users(id),
            exception_date DATE NOT NULL,
            start_time TIME,
            end_time TIME,
            reason VARCHAR(200),
            created_at TIMESTAMPTZ DEFAULT now(),
            updated_at TIMESTAMPTZ DEFAULT now()
        )
    """))
    conn.execute(sa.text("CREATE INDEX IF NOT EXISTS ix_schedule_exceptions_tenant_id ON schedule_exceptions(tenant_id)"))
    conn.execute(sa.text("CREATE INDEX IF NOT EXISTS ix_schedule_exceptions_veterinarian_id ON schedule_exceptions(veterinarian_id)"))
    conn.execute(sa.text("CREATE INDEX IF NOT EXISTS ix_schedule_exceptions_exception_date ON schedule_exceptions(exception_date)"))

    # ── portal_magic_links ────────────────────────────────────────────────────
    conn.execute(sa.text("""
        CREATE TABLE IF NOT EXISTS portal_magic_links (
            id UUID PRIMARY KEY,
            tenant_id UUID NOT NULL REFERENCES tenants(id),
            email VARCHAR(255) NOT NULL,
            token VARCHAR(64) NOT NULL UNIQUE,
            expires_at TIMESTAMPTZ NOT NULL,
            used BOOLEAN NOT NULL DEFAULT false,
            client_id UUID REFERENCES clients(id),
            created_at TIMESTAMPTZ DEFAULT now(),
            updated_at TIMESTAMPTZ DEFAULT now()
        )
    """))
    conn.execute(sa.text("CREATE INDEX IF NOT EXISTS ix_portal_magic_links_tenant_id ON portal_magic_links(tenant_id)"))
    conn.execute(sa.text("CREATE INDEX IF NOT EXISTS ix_portal_magic_links_email ON portal_magic_links(email)"))
    conn.execute(sa.text("CREATE INDEX IF NOT EXISTS ix_portal_magic_links_token ON portal_magic_links(token)"))

    # ── appointments: new columns (idempotent with IF NOT EXISTS) ─────────────
    conn.execute(sa.text("""
        ALTER TABLE appointments
            ADD COLUMN IF NOT EXISTS service_id UUID REFERENCES services(id),
            ADD COLUMN IF NOT EXISTS guest_name VARCHAR(200),
            ADD COLUMN IF NOT EXISTS guest_phone VARCHAR(20)
    """))

    # Enum type (create only if not exists — the DB may have it from create_all)
    conn.execute(sa.text("""
        DO $$ BEGIN
            CREATE TYPE appointmentsource AS ENUM ('INTERNAL', 'PORTAL');
        EXCEPTION WHEN duplicate_object THEN NULL;
        END $$
    """))
    # Use uppercase default to match SQLAlchemy's .name-based storage
    conn.execute(sa.text("""
        ALTER TABLE appointments
            ADD COLUMN IF NOT EXISTS source appointmentsource NOT NULL DEFAULT 'INTERNAL'
    """))


def downgrade() -> None:
    conn = op.get_bind()
    conn.execute(sa.text("ALTER TABLE appointments DROP COLUMN IF EXISTS guest_phone"))
    conn.execute(sa.text("ALTER TABLE appointments DROP COLUMN IF EXISTS guest_name"))
    conn.execute(sa.text("ALTER TABLE appointments DROP COLUMN IF EXISTS source"))
    conn.execute(sa.text("ALTER TABLE appointments DROP COLUMN IF EXISTS service_id"))

    conn.execute(sa.text("DROP INDEX IF EXISTS ix_portal_magic_links_token"))
    conn.execute(sa.text("DROP INDEX IF EXISTS ix_portal_magic_links_email"))
    conn.execute(sa.text("DROP INDEX IF EXISTS ix_portal_magic_links_tenant_id"))
    conn.execute(sa.text("DROP TABLE IF EXISTS portal_magic_links"))

    conn.execute(sa.text("DROP INDEX IF EXISTS ix_schedule_exceptions_exception_date"))
    conn.execute(sa.text("DROP INDEX IF EXISTS ix_schedule_exceptions_veterinarian_id"))
    conn.execute(sa.text("DROP INDEX IF EXISTS ix_schedule_exceptions_tenant_id"))
    conn.execute(sa.text("DROP TABLE IF EXISTS schedule_exceptions"))

    conn.execute(sa.text("DROP INDEX IF EXISTS ix_veterinarian_schedules_veterinarian_id"))
    conn.execute(sa.text("DROP INDEX IF EXISTS ix_veterinarian_schedules_tenant_id"))
    conn.execute(sa.text("DROP TABLE IF EXISTS veterinarian_schedules"))

    conn.execute(sa.text("DROP INDEX IF EXISTS ix_veterinarian_services_service_id"))
    conn.execute(sa.text("DROP INDEX IF EXISTS ix_veterinarian_services_veterinarian_id"))
    conn.execute(sa.text("DROP TABLE IF EXISTS veterinarian_services"))

    conn.execute(sa.text("DROP INDEX IF EXISTS ix_services_tenant_id"))
    conn.execute(sa.text("DROP TABLE IF EXISTS services"))

    conn.execute(sa.text("DROP TYPE IF EXISTS appointmentsource"))
