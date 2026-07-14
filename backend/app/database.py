from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine

from app.config import settings

# Neon (y otros Postgres gestionados) exigen SSL. asyncpg no entiende los
# parámetros sslmode/channel_binding de la cadena, así que el SSL se pasa aquí.
connect_args = {"ssl": True} if "neon.tech" in settings.DATABASE_URL else {}

engine = create_async_engine(settings.DATABASE_URL, echo=False, connect_args=connect_args)
async_session = async_sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)


async def get_db():
    async with async_session() as session:
        try:
            yield session
            await session.commit()
        except Exception:
            await session.rollback()
            raise
