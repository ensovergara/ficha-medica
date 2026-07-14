from functools import wraps
from typing import Callable

from fastapi import HTTPException, status

from app.models.user import UserRole

ROLE_PERMISSIONS: dict[UserRole, set[str]] = {
    UserRole.SUPERADMIN: {"*"},
    UserRole.ADMIN: {
        "tenants:read",
        "users:read", "users:write", "users:delete",
        "clients:read", "clients:write", "clients:delete",
        "patients:read", "patients:write", "patients:delete",
        "medical_records:read", "medical_records:write",
        "consultations:read", "consultations:write",
        "vaccinations:read", "vaccinations:write",
        "prescriptions:read", "prescriptions:write",
        "lab_results:read", "lab_results:write",
        "appointments:read", "appointments:write", "appointments:delete",
        "inventory:read", "inventory:write",
        "invoices:read", "invoices:write",
        "reports:read",
        "subscriptions:read",
    },
    UserRole.VETERINARIO: {
        "clients:read",
        "patients:read", "patients:write",
        "medical_records:read", "medical_records:write",
        "consultations:read", "consultations:write",
        "vaccinations:read", "vaccinations:write",
        "prescriptions:read", "prescriptions:write",
        "lab_results:read", "lab_results:write",
        "appointments:read",
        "inventory:read",
    },
    UserRole.RECEPCIONISTA: {
        "clients:read", "clients:write",
        "patients:read", "patients:write",
        "medical_records:read",
        "consultations:read",
        "vaccinations:read",
        "appointments:read", "appointments:write", "appointments:delete",
        "invoices:read", "invoices:write",
    },
    UserRole.AUXILIAR: {
        "clients:read",
        "patients:read",
        "medical_records:read",
        "consultations:read",
        "vaccinations:read", "vaccinations:write",
        "inventory:read", "inventory:write",
    },
}


def has_permission(role: UserRole, permission: str) -> bool:
    perms = ROLE_PERMISSIONS.get(role, set())
    return "*" in perms or permission in perms


def require_permission(permission: str) -> Callable:
    def decorator(func: Callable) -> Callable:
        @wraps(func)
        async def wrapper(*args, current_user=None, **kwargs):
            if current_user and not has_permission(current_user.role, permission):
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="No tienes permisos para realizar esta acción",
                )
            return await func(*args, current_user=current_user, **kwargs)
        return wrapper
    return decorator


def require_role(roles: list[UserRole]) -> Callable:
    def decorator(func: Callable) -> Callable:
        @wraps(func)
        async def wrapper(*args, current_user=None, **kwargs):
            if current_user and current_user.role not in roles:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="Rol insuficiente para esta acción",
                )
            return await func(*args, current_user=current_user, **kwargs)
        return wrapper
    return decorator
