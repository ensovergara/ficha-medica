"""Tests unitarios para core/permissions.py — sin base de datos."""
import pytest

from app.core.permissions import has_permission
from app.models.user import UserRole


class TestHasPermission:
    def test_superadmin_has_any_permission(self):
        for perm in ["patients:write", "users:delete", "invoices:read", "anything"]:
            assert has_permission(UserRole.SUPERADMIN, perm) is True

    def test_admin_has_expected_permissions(self):
        assert has_permission(UserRole.ADMIN, "users:write") is True
        assert has_permission(UserRole.ADMIN, "reports:read") is True
        assert has_permission(UserRole.ADMIN, "patients:delete") is True

    def test_admin_cannot_manage_superadmin_things(self):
        # superadmin-only: no hay permiso específico "superadmin:*" para admin
        assert has_permission(UserRole.ADMIN, "subscriptions:write") is False

    def test_veterinario_can_read_write_medical(self):
        assert has_permission(UserRole.VETERINARIO, "medical_records:write") is True
        assert has_permission(UserRole.VETERINARIO, "consultations:write") is True
        assert has_permission(UserRole.VETERINARIO, "vaccinations:write") is True

    def test_veterinario_cannot_manage_users(self):
        assert has_permission(UserRole.VETERINARIO, "users:write") is False
        assert has_permission(UserRole.VETERINARIO, "users:delete") is False

    def test_veterinario_cannot_invoice(self):
        assert has_permission(UserRole.VETERINARIO, "invoices:write") is False

    def test_recepcionista_can_manage_appointments(self):
        assert has_permission(UserRole.RECEPCIONISTA, "appointments:write") is True
        assert has_permission(UserRole.RECEPCIONISTA, "appointments:delete") is True

    def test_recepcionista_cannot_write_medical_records(self):
        assert has_permission(UserRole.RECEPCIONISTA, "medical_records:write") is False

    def test_auxiliar_can_update_stock(self):
        assert has_permission(UserRole.AUXILIAR, "inventory:write") is True

    def test_auxiliar_cannot_invoice(self):
        assert has_permission(UserRole.AUXILIAR, "invoices:write") is False

    def test_unknown_role_has_no_permissions(self):
        # role no registrado → set vacío
        assert has_permission("ghost_role", "patients:read") is False  # type: ignore
