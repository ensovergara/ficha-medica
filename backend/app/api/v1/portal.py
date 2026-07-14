import secrets
import uuid
from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.dependencies import get_current_user, get_tenant_id, require_permission_dep
from app.models.client import Client
from app.models.client_portal import ClientPortalAccess
from app.models.patient import Patient
from app.models.user import User
from app.models.vaccination import Vaccination

router = APIRouter(prefix="/portal", tags=["Client Portal"])


@router.post("/generate-access/{client_id}")
async def generate_portal_access(
    client_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_permission_dep("clients:write")),
    tenant_id: uuid.UUID = Depends(get_tenant_id),
):
    """Generate a unique access code for a client to view their pets."""
    client_r = await db.execute(select(Client).where(Client.id == client_id, Client.tenant_id == tenant_id))
    if not client_r.scalar_one_or_none():
        raise HTTPException(status_code=404, detail="Cliente no encontrado")

    # Revoke existing
    existing_r = await db.execute(select(ClientPortalAccess).where(
        ClientPortalAccess.client_id == client_id, ClientPortalAccess.is_active == True
    ))
    for existing in existing_r.scalars().all():
        existing.is_active = False

    code = secrets.token_urlsafe(12)[:16]
    access = ClientPortalAccess(
        tenant_id=tenant_id,
        client_id=client_id,
        access_code=code,
        expires_at=datetime.now(timezone.utc) + timedelta(days=365),
    )
    db.add(access)
    await db.flush()

    return {"access_code": code, "portal_url": f"/portal?code={code}"}


@router.get("/view")
async def view_portal(
    code: str = Query(...),
    db: AsyncSession = Depends(get_db),
):
    """Public endpoint — pet owners view their pets with access code."""
    access_r = await db.execute(select(ClientPortalAccess).where(
        ClientPortalAccess.access_code == code,
        ClientPortalAccess.is_active == True,
    ))
    access = access_r.scalar_one_or_none()
    if not access:
        raise HTTPException(status_code=404, detail="Código inválido o expirado")

    if access.expires_at and access.expires_at < datetime.now(timezone.utc):
        raise HTTPException(status_code=403, detail="Código expirado")

    client_r = await db.execute(select(Client).where(Client.id == access.client_id))
    client = client_r.scalar_one_or_none()

    patients_r = await db.execute(select(Patient).where(Patient.client_id == access.client_id, Patient.is_active == True))
    patients = patients_r.scalars().all()

    patient_data = []
    for p in patients:
        vac_r = await db.execute(select(Vaccination).where(Vaccination.patient_id == p.id).order_by(Vaccination.created_at.desc()))
        vaccinations = vac_r.scalars().all()
        patient_data.append({
            "id": str(p.id),
            "name": p.name,
            "species": p.species,
            "breed": p.breed,
            "birth_date": str(p.birth_date) if p.birth_date else None,
            "sex": p.sex,
            "weight": float(p.weight) if p.weight else None,
            "vaccinations": [
                {"vaccine_name": v.vaccine_name, "date": v.created_at.isoformat(), "next_dose": str(v.next_dose_date) if v.next_dose_date else None}
                for v in vaccinations
            ],
        })

    return {
        "client": {"first_name": client.first_name, "last_name": client.last_name} if client else {},
        "pets": patient_data,
    }
