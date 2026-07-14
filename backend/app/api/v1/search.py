import uuid

from fastapi import APIRouter, Depends, Query
from sqlalchemy import or_, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.dependencies import get_current_user, get_tenant_id, tenant_filter
from app.models.client import Client
from app.models.patient import Patient
from app.models.user import User

router = APIRouter(prefix="/search", tags=["Search"])


@router.get("/")
async def global_search(
    q: str = Query(..., min_length=2),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
    tenant_id: uuid.UUID = Depends(get_tenant_id),
):
    results = {"patients": [], "clients": []}

    # Search patients
    patient_q = select(Patient).where(
        *tenant_filter(Patient, tenant_id),
        or_(Patient.name.ilike(f"%{q}%"), Patient.microchip.ilike(f"%{q}%")),
    ).limit(5)
    patients = (await db.execute(patient_q)).scalars().all()
    results["patients"] = [
        {"id": str(p.id), "name": p.name, "species": p.species, "type": "patient"}
        for p in patients
    ]

    # Search clients
    client_q = select(Client).where(
        *tenant_filter(Client, tenant_id),
        or_(
            Client.first_name.ilike(f"%{q}%"),
            Client.last_name.ilike(f"%{q}%"),
            Client.rut.ilike(f"%{q}%"),
            Client.email.ilike(f"%{q}%"),
        ),
    ).limit(5)
    clients = (await db.execute(client_q)).scalars().all()
    results["clients"] = [
        {"id": str(c.id), "name": f"{c.first_name} {c.last_name}", "rut": c.rut, "type": "client"}
        for c in clients
    ]

    return results
