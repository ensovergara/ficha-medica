"""Tests unitarios para core/security.py — sin base de datos."""
import time

import pytest
from jose import jwt

from app.config import settings
from app.core.security import (
    create_access_token,
    create_refresh_token,
    decode_token,
    hash_password,
    verify_password,
)


class TestPasswordHashing:
    def test_hash_is_not_plaintext(self):
        hashed = hash_password("mypassword")
        assert hashed != "mypassword"

    def test_verify_correct_password(self):
        hashed = hash_password("correct")
        assert verify_password("correct", hashed) is True

    def test_verify_wrong_password(self):
        hashed = hash_password("correct")
        assert verify_password("wrong", hashed) is False

    def test_same_password_produces_different_hashes(self):
        h1 = hash_password("same")
        h2 = hash_password("same")
        assert h1 != h2  # bcrypt usa salt aleatorio


class TestJWT:
    def test_access_token_contains_sub(self):
        token = create_access_token({"sub": "user-123"})
        payload = decode_token(token)
        assert payload is not None
        assert payload["sub"] == "user-123"

    def test_access_token_type(self):
        token = create_access_token({"sub": "x"})
        payload = decode_token(token)
        assert payload["type"] == "access"

    def test_refresh_token_type(self):
        token = create_refresh_token({"sub": "x"})
        payload = decode_token(token)
        assert payload["type"] == "refresh"

    def test_invalid_token_returns_none(self):
        assert decode_token("not.a.valid.token") is None

    def test_tampered_token_returns_none(self):
        token = create_access_token({"sub": "x"})
        tampered = token[:-5] + "XXXXX"
        assert decode_token(tampered) is None

    def test_token_with_wrong_secret_returns_none(self):
        bad_token = jwt.encode(
            {"sub": "x", "type": "access"},
            "wrong-secret",
            algorithm=settings.ALGORITHM,
        )
        assert decode_token(bad_token) is None
