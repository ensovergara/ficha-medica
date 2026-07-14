from sqlalchemy import select

from app.config import settings
from app.core.security import hash_password
from app.database import async_session, engine
from app.models.base import Base
from app.models.subscription import Plan
from app.models.user import User, UserRole

# Import all models so Base.metadata knows about them
import app.models  # noqa: F401


async def seed_data():
    # Create all tables (idempotent - skips existing)
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    async with async_session() as session:
        # Seed plans
        existing_plans = await session.execute(select(Plan).limit(1))
        if not existing_plans.scalar_one_or_none():
            plans = [
                Plan(
                    name="Trial",
                    max_users=1,
                    max_patients=50,
                    features={"core_clinic": True, "appointments": True},
                    price_monthly=0,
                    price_yearly=0,
                ),
                Plan(
                    name="Básico",
                    max_users=3,
                    max_patients=200,
                    features={"core_clinic": True, "appointments": True},
                    price_monthly=29990,
                    price_yearly=299900,
                ),
                Plan(
                    name="Profesional",
                    max_users=10,
                    max_patients=None,
                    features={
                        "core_clinic": True,
                        "appointments": True,
                        "inventory": True,
                        "invoicing": True,
                        "reports": True,
                    },
                    price_monthly=59990,
                    price_yearly=599900,
                ),
                Plan(
                    name="Enterprise",
                    max_users=None,
                    max_patients=None,
                    features={
                        "core_clinic": True,
                        "appointments": True,
                        "inventory": True,
                        "invoicing": True,
                        "reports": True,
                        "api_access": True,
                        "priority_support": True,
                        "customization": True,
                    },
                    price_monthly=99990,
                    price_yearly=999900,
                ),
            ]
            session.add_all(plans)

        # Seed superadmin
        existing_admin = await session.execute(
            select(User).where(User.role == UserRole.SUPERADMIN).limit(1)
        )
        if not existing_admin.scalar_one_or_none():
            superadmin = User(
                email=settings.SUPERADMIN_EMAIL,
                hashed_password=hash_password(settings.SUPERADMIN_PASSWORD),
                first_name="Super",
                last_name="Admin",
                role=UserRole.SUPERADMIN,
            )
            session.add(superadmin)

        await session.commit()
