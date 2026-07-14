"""Tests de integración para pacientes — CRUD y aislamiento multi-tenant."""
import uuid

import pytest
from httpx import AsyncClient

from app.core.security import hash_password
from app.models.subscription import Plan, Subscription, SubscriptionStatus
from app.models.tenant import Tenant
from app.models.user import User, UserRole
from tests.conftest import auth, get_token


class TestPatientsCRUD:
    async def test_list_patients_empty(self, client: AsyncClient, admin_token):
        resp = await client.get("/api/v1/patients/", headers=auth(admin_token))
        assert resp.status_code == 200
        assert isinstance(resp.json(), list)

    async def test_create_patient(self, client: AsyncClient, admin_token, db, tenant, admin_user):
        from app.models.client import Client
        c = Client(tenant_id=tenant.id, first_name="Juan", last_name="Pérez", rut="11111111-1")
        db.add(c)
        await db.commit()  # commit para que el app lo vea
        await db.refresh(c)

        resp = await client.post("/api/v1/patients/", json={
            "client_id": str(c.id),
            "name": "Firulais",
            "species": "Perro",
        }, headers=auth(admin_token))
        assert resp.status_code == 201
        data = resp.json()
        assert data["name"] == "Firulais"
        assert data["species"] == "Perro"

    async def test_create_patient_requires_auth(self, client: AsyncClient):
        resp = await client.post("/api/v1/patients/", json={"name": "x", "species": "y"})
        assert resp.status_code == 403

    async def test_get_patient_not_found(self, client: AsyncClient, admin_token):
        resp = await client.get(f"/api/v1/patients/{uuid.uuid4()}", headers=auth(admin_token))
        assert resp.status_code == 404


class TestTenantIsolation:
    """Un usuario de Tenant A no debe ver pacientes de Tenant B."""

    async def test_tenant_isolation(self, client: AsyncClient, db, plan):
        # Crear dos tenants independientes
        t_a = Tenant(name="Clínica A", slug=f"a-{uuid.uuid4().hex[:6]}", is_active=True)
        t_b = Tenant(name="Clínica B", slug=f"b-{uuid.uuid4().hex[:6]}", is_active=True)
        db.add_all([t_a, t_b])
        await db.flush()

        for t in [t_a, t_b]:
            db.add(Subscription(tenant_id=t.id, plan_id=plan.id, status=SubscriptionStatus.ACTIVE))
        await db.flush()

        # Admin de A y admin de B
        user_a = User(tenant_id=t_a.id, email=f"admin-a-{uuid.uuid4().hex[:4]}@test.com",
                      hashed_password=hash_password("Test1234!"), first_name="A", last_name="A",
                      role=UserRole.ADMIN, is_active=True)
        user_b = User(tenant_id=t_b.id, email=f"admin-b-{uuid.uuid4().hex[:4]}@test.com",
                      hashed_password=hash_password("Test1234!"), first_name="B", last_name="B",
                      role=UserRole.ADMIN, is_active=True)
        db.add_all([user_a, user_b])
        await db.flush()

        # Cliente y paciente en Tenant A
        from app.models.client import Client
        from app.models.patient import Patient
        c_a = Client(tenant_id=t_a.id, first_name="Cliente", last_name="A", rut="22222222-2")
        db.add(c_a)
        await db.commit()
        await db.refresh(c_a)
        p_a = Patient(tenant_id=t_a.id, client_id=c_a.id, name="PacienteDeA", species="Gato")
        db.add(p_a)
        await db.commit()
        await db.refresh(p_a)

        token_a = await get_token(client, user_a.email, "Test1234!")
        token_b = await get_token(client, user_b.email, "Test1234!")

        # Usuario A ve su paciente
        resp_a = await client.get("/api/v1/patients/", headers=auth(token_a))
        names_a = [p["name"] for p in resp_a.json()]
        assert "PacienteDeA" in names_a

        # Usuario B NO ve el paciente de A
        resp_b = await client.get("/api/v1/patients/", headers=auth(token_b))
        names_b = [p["name"] for p in resp_b.json()]
        assert "PacienteDeA" not in names_b

        # Usuario B no puede acceder al paciente de A por ID
        resp_direct = await client.get(f"/api/v1/patients/{p_a.id}", headers=auth(token_b))
        assert resp_direct.status_code == 404


class TestPlanLimits:
    async def test_patient_limit_enforced(self, client: AsyncClient, db, admin_user, tenant, plan):
        # Poner límite de 1 paciente
        plan.max_patients = 1
        await db.flush()

        from app.models.client import Client
        from app.models.patient import Patient

        c = Client(tenant_id=tenant.id, first_name="Lim", last_name="Test", rut="33333333-3")
        db.add(c)
        await db.commit()
        await db.refresh(c)

        # Primer paciente: debe pasar
        p1 = Patient(tenant_id=tenant.id, client_id=c.id, name="Paciente1", species="Perro")
        db.add(p1)
        await db.commit()
        await db.refresh(p1)

        # Bajar límite a 1 (commit para que el app lo vea)
        from sqlalchemy import select
        from app.models.subscription import Plan as PlanModel
        plan_obj = (await db.execute(select(PlanModel).where(PlanModel.id == plan.id))).scalar_one()
        plan_obj.max_patients = 1
        await db.commit()

        token = await get_token(client, admin_user.email, "Test1234!")

        # Segundo paciente: debe fallar con 403
        resp = await client.post("/api/v1/patients/", json={
            "client_id": str(c.id), "name": "Paciente2", "species": "Gato",
        }, headers=auth(token))
        assert resp.status_code == 403
        assert "límite" in resp.json()["detail"].lower()
