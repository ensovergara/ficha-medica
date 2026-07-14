from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    POSTGRES_USER: str = "vetadmin"
    POSTGRES_PASSWORD: str = "vetpassword123"
    POSTGRES_DB: str = "fichamedica"
    POSTGRES_HOST: str = "db"
    POSTGRES_PORT: int = 5432
    DATABASE_URL: str = "postgresql+asyncpg://vetadmin:vetpassword123@db:5432/fichamedica"

    SECRET_KEY: str = "your-super-secret-key-change-in-production"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30
    REFRESH_TOKEN_EXPIRE_DAYS: int = 7

    BACKEND_CORS_ORIGINS: str = "http://localhost:3000"

    SUPERADMIN_EMAIL: str = "admin@fichamedica.com"
    SUPERADMIN_PASSWORD: str = "admin123456"

    # Email (Resend) — opcional en desarrollo, usar ConsoleProvider si no está definido
    RESEND_API_KEY: str | None = None
    EMAIL_FROM: str = "FichaMédica Pet <noreply@fichamedica.app>"

    # URL base del frontend (para construir magic links absolutos)
    FRONTEND_URL: str = "http://localhost:3000"

    model_config = {"env_file": ".env", "extra": "ignore"}


settings = Settings()
