import uuid

from fastapi import Depends, HTTPException, Request, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.permissions import has_permission
from app.core.security import decode_token
from app.database import get_db
from app.models.user import User, UserRole

security = HTTPBearer()


async def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: AsyncSession = Depends(get_db),
) -> User:
    payload = decode_token(credentials.credentials)
    if payload is None or payload.get("type") != "access":
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token inválido o expirado",
        )
    user_id = payload.get("sub")
    if not user_id:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Token inválido")

    result = await db.execute(select(User).where(User.id == uuid.UUID(user_id)))
    user = result.scalar_one_or_none()
    if not user or not user.is_active:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Usuario no encontrado o inactivo")
    return user


def require_permission_dep(permission: str):
    async def dependency(current_user: User = Depends(get_current_user)):
        if not has_permission(current_user.role, permission):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="No tienes permisos para realizar esta acción",
            )
        return current_user
    return dependency


def require_role_dep(roles: list[UserRole]):
    async def dependency(current_user: User = Depends(get_current_user)):
        if current_user.role not in roles:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Rol insuficiente para esta acción",
            )
        return current_user
    return dependency


def tenant_filter(model_class, tenant_id: uuid.UUID | None) -> list:
    """Returns tenant filter conditions. Empty list for superadmin (sees all)."""
    if tenant_id is None:
        return []
    return [model_class.tenant_id == tenant_id]


def get_tenant_id(request: Request, current_user: User = Depends(get_current_user)) -> uuid.UUID | None:
    if current_user.role == UserRole.SUPERADMIN:
        target = request.headers.get("X-Target-Tenant-Id")
        if target:
            try:
                return uuid.UUID(target)
            except ValueError:
                raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="X-Target-Tenant-Id inválido")
        return None  # superadmin sin filtro → ve todo
    if not current_user.tenant_id:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Usuario sin tenant asignado")
    return current_user.tenant_id
