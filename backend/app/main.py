from contextlib import asynccontextmanager

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from slowapi import _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded
from sqlalchemy import text

from app.api.v1.router import api_router
from app.config import settings
from app.core.limiter import limiter
from app.database import get_db
from app.seed import seed_data


@asynccontextmanager
async def lifespan(app: FastAPI):
    await seed_data()
    yield


app = FastAPI(
    title="Ficha Médica Pet - API",
    description="Sistema SaaS de fichas médicas para veterinarias",
    version="1.0.0",
    lifespan=lifespan,
)

app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.BACKEND_CORS_ORIGINS.split(","),
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(api_router)


@app.get("/health", tags=["Health"])
async def health_check(request: Request):
    db_status = "ok"
    try:
        async for session in get_db():
            await session.execute(text("SELECT 1"))
            break
    except Exception:
        db_status = "unavailable"

    if db_status != "ok":
        return JSONResponse(status_code=503, content={"status": "error", "database": db_status})
    return {"status": "ok", "database": db_status, "version": "1.0.0"}
