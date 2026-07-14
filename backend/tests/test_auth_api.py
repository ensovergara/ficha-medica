"""Tests de integración para endpoints de autenticación."""
import pytest
from httpx import AsyncClient

from tests.conftest import auth


class TestLogin:
    async def test_login_success(self, client: AsyncClient, admin_user):
        resp = await client.post("/api/v1/auth/login", json={
            "email": admin_user.email,
            "password": "Test1234!",
        })
        assert resp.status_code == 200
        data = resp.json()
        assert "access_token" in data
        assert "refresh_token" in data

    async def test_login_wrong_password(self, client: AsyncClient, admin_user):
        resp = await client.post("/api/v1/auth/login", json={
            "email": admin_user.email,
            "password": "wrongpassword",
        })
        assert resp.status_code == 401

    async def test_login_nonexistent_user(self, client: AsyncClient):
        resp = await client.post("/api/v1/auth/login", json={
            "email": "nobody@noexist.com",
            "password": "whatever",
        })
        assert resp.status_code == 401

    async def test_inactive_user_cannot_login(self, client: AsyncClient, db, admin_user):
        from sqlalchemy import select
        from app.models.user import User as UserModel
        u = (await db.execute(select(UserModel).where(UserModel.id == admin_user.id))).scalar_one()
        u.is_active = False
        await db.commit()

        resp = await client.post("/api/v1/auth/login", json={
            "email": admin_user.email,
            "password": "Test1234!",
        })
        assert resp.status_code == 403


class TestGetMe:
    async def test_get_me_authenticated(self, client: AsyncClient, admin_token, admin_user):
        resp = await client.get("/api/v1/auth/me", headers=auth(admin_token))
        assert resp.status_code == 200
        assert resp.json()["email"] == admin_user.email

    async def test_get_me_unauthenticated(self, client: AsyncClient):
        resp = await client.get("/api/v1/auth/me")
        assert resp.status_code == 403


class TestRefreshToken:
    async def test_refresh_returns_new_tokens(self, client: AsyncClient, admin_user):
        login = await client.post("/api/v1/auth/login", json={
            "email": admin_user.email, "password": "Test1234!",
        })
        refresh_token = login.json()["refresh_token"]

        resp = await client.post("/api/v1/auth/refresh", json={"refresh_token": refresh_token})
        assert resp.status_code == 200
        assert "access_token" in resp.json()

    async def test_invalid_refresh_token_rejected(self, client: AsyncClient):
        resp = await client.post("/api/v1/auth/refresh", json={"refresh_token": "fake.token.here"})
        assert resp.status_code == 401


class TestChangePassword:
    async def test_change_password_success(self, client: AsyncClient, admin_token):
        resp = await client.post(
            "/api/v1/auth/change-password",
            json={"current_password": "Test1234!", "new_password": "NewPass5678!"},
            headers=auth(admin_token),
        )
        assert resp.status_code == 204

    async def test_change_password_wrong_current(self, client: AsyncClient, admin_token):
        resp = await client.post(
            "/api/v1/auth/change-password",
            json={"current_password": "wrongpass", "new_password": "NewPass5678!"},
            headers=auth(admin_token),
        )
        assert resp.status_code == 400

    async def test_change_password_too_short(self, client: AsyncClient, admin_token):
        resp = await client.post(
            "/api/v1/auth/change-password",
            json={"current_password": "Test1234!", "new_password": "short"},
            headers=auth(admin_token),
        )
        assert resp.status_code == 400
