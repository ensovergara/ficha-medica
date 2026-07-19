from functools import wraps
from typing import Callable

from fastapi import HTTPException, status, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.models.user import User
from app.dependencies import get_current_user
from app.core.features import has_feature


def require_feature(feature_key: str):
    """Decorator to protect endpoints with feature gates.
    Blocks with 403 if tenant doesn't have the feature."""
    def decorator(func: Callable) -> Callable:
        @wraps(func)
        async def wrapper(*args, **kwargs):
            db: AsyncSession = kwargs.get("db") or next(
                (v for k, v in kwargs.items() if isinstance(v, AsyncSession)), None
            )
            current_user: User = kwargs.get("current_user") or next(
                (v for k, v in kwargs.items() if isinstance(v, User)), None
            )

            if not db or not current_user:
                raise HTTPException(
                    status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                    detail="Missing dependencies",
                )

            if not current_user.tenant_id:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Sin tenant asignado",
                )

            access = await has_feature(db, current_user.tenant_id, feature_key)
            if not access:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail=f"Feature '{feature_key}' no disponible en tu plan",
                )

            return await func(*args, **kwargs)

        return wrapper

    return decorator
