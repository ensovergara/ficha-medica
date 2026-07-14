"""
Tests de integración — FichaMédica Pet.

Requiere DB de test:
  docker-compose exec db createdb -U vetadmin fichamedica_test

Ejecutar:
  docker-compose exec backend pytest                          # todos
  docker-compose exec backend pytest tests/test_security.py  # solo unitarios
"""
import asyncio
import os
import uuid

import pytest
import pytest_asyncio
from httpx import ASGITransport, AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine

TEST_DB_URL = os.getenv(
    "TEST_DATABASE_URL",
    "postgresql+asyncpg://vetadmin:vetpassword123@db:5432/fichamedica_test",
)
os.environ["DATABASE_URL"] = TEST_DB_URL

from app.core.security import hash_password  # noqa: E402
from app.database import get_db  # noqa: E402
from app.main import app  # noqa: E402
from app.models import *  # noqa: F401, F403
from app.models.base import Base  # noqa: E402
from app.models.subscription import Plan, Subscription, SubscriptionStatus  # noqa: E402
from app.models.tenant import Tenant  # noqa: E402
from app.models.user import User, UserRole  # noqa: E402
from app.core.limiter import limiter

limiter.enabled = False  # sin rate limiting en tests


# ---------------------------------------------------------------------------
# Tablas: setup/teardown SYNC una vez por sesión de tests
# Evita conflictos de event loop entre fixtures session-scoped y function-scoped.
# ---------------------------------------------------------------------------

@pytest.fixture(scope="session", autouse=True)
def create_test_tables():
    async def _run():
        engine = create_async_engine(TEST_DB_URL, echo=False)
        async with engine.begin() as conn:
            await conn.run_sync(Base.metadata.drop_all)
            await conn.run_sync(Base.metadata.create_all)
        await engine.dispose()

    asyncio.run(_run())
    yield
    # Opcional: limpiar tablas al final
    # asyncio.run(drop())


# ---------------------------------------------------------------------------
# Engine y session factory — FUNCTION scoped para evitar conflictos de event loop
# Cada test crea su propio engine ligado al event loop del test.
# ---------------------------------------------------------------------------

@pytest_asyncio.fixture
async def engine():
    eng = create_async_engine(TEST_DB_URL, echo=False, pool_size=2, max_overflow=0)
    yield eng
    await eng.dispose()


@pytest_asyncio.fixture
def session_factory(engine):
    return async_sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)


@pytest_asyncio.fixture
async def db(session_factory):
    """Sesión para test data setup. Commit explícito para que el app lo vea."""
    async with session_factory() as session:
        yield session
        try:
            await session.commit()
        except Exception:
            await session.rollback()


@pytest_asyncio.fixture
async def client(session_factory):
    """Cliente HTTP. Cada request usa una sesión propia del mismo engine."""
    async def override_db():
        async with session_factory() as session:
            try:
                yield session
                await session.commit()
            except Exception:
                await session.rollback()
                raise

    app.dependency_overrides[get_db] = override_db
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        yield ac
    app.dependency_overrides.clear()


# ---------------------------------------------------------------------------
# Datos base — cada fixture hace commit para ser visible al app
# ---------------------------------------------------------------------------

@pytest_asyncio.fixture
async def plan(session_factory) -> Plan:
    async with session_factory() as s:
        p = Plan(
            name=f"Plan-{uuid.uuid4().hex[:6]}",
            max_users=10, max_patients=50,
            price_monthly=0, price_yearly=0, is_active=True,
        )
        s.add(p)
        await s.commit()
        await s.refresh(p)
        return p


@pytest_asyncio.fixture
async def tenant(session_factory, plan) -> Tenant:
    async with session_factory() as s:
        t = Tenant(name="Clínica Test", slug=f"clinica-{uuid.uuid4().hex[:8]}", is_active=True)
        s.add(t)
        await s.flush()
        s.add(Subscription(tenant_id=t.id, plan_id=plan.id, status=SubscriptionStatus.ACTIVE))
        await s.commit()
        await s.refresh(t)
        return t


@pytest_asyncio.fixture
async def admin_user(session_factory, tenant) -> User:
    async with session_factory() as s:
        u = User(
            tenant_id=tenant.id,
            email=f"admin-{uuid.uuid4().hex[:8]}@test.com",
            hashed_password=hash_password("Test1234!"),
            first_name="Admin", last_name="Test",
            role=UserRole.ADMIN, is_active=True,
        )
        s.add(u)
        await s.commit()
        await s.refresh(u)
        return u


@pytest_asyncio.fixture
async def superadmin_user(session_factory) -> User:
    async with session_factory() as s:
        u = User(
            tenant_id=None,
            email=f"super-{uuid.uuid4().hex[:8]}@test.com",
            hashed_password=hash_password("Super1234!"),
            first_name="Super", last_name="Admin",
            role=UserRole.SUPERADMIN, is_active=True,
        )
        s.add(u)
        await s.commit()
        await s.refresh(u)
        return u


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

async def get_token(client: AsyncClient, email: str, password: str) -> str:
    resp = await client.post("/api/v1/auth/login", json={"email": email, "password": password})
    assert resp.status_code == 200, f"Login falló ({resp.status_code}): {resp.text}"
    return resp.json()["access_token"]


@pytest_asyncio.fixture
async def admin_token(client, admin_user) -> str:
    return await get_token(client, admin_user.email, "Test1234!")


@pytest_asyncio.fixture
async def superadmin_token(client, superadmin_user) -> str:
    return await get_token(client, superadmin_user.email, "Super1234!")


def auth(token: str) -> dict:
    return {"Authorization": f"Bearer {token}"}
