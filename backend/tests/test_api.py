"""Smoke tests with an in-memory sqlite DB (no postgres needed)."""
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app.database import get_db as _orig_get_db
from app.models import Base  # noqa: F401

engine = create_engine("sqlite://", connect_args={"check_same_thread": False}, poolclass=StaticPool)
TestingSession = sessionmaker(bind=engine, autoflush=False, autocommit=False)
Base.metadata.create_all(bind=engine)


def _override():
    session = TestingSession()
    try:
        yield session
    finally:
        session.close()


from app.main import app  # noqa: E402

app.dependency_overrides[_orig_get_db] = _override
client = TestClient(app, raise_server_exceptions=False)


def test_health():
    assert client.get("/health").status_code == 200


def test_register_login_me():
    email = "tester@vod.gg"
    r = client.post("/api/auth/register", json={"email": email, "password": "secret123", "nickname": "tester"})
    assert r.status_code == 200, r.text
    token = r.json()["access_token"]
    me = client.get("/api/auth/me", headers={"Authorization": f"Bearer {token}"})
    assert me.status_code == 200
    assert me.json()["email"] == email


def test_full_match_flow():
    email = "flow@vod.gg"
    r = client.post("/api/auth/register", json={"email": email, "password": "secret123", "nickname": "flow"})
    token = r.json()["access_token"]
    h = {"Authorization": f"Bearer {token}"}
    up = client.post("/api/matches/upload", files={"file": ("test.dem", b"fake-demo-bytes")},
                     data={"opponent": "Test Opp", "map_name": "mirage"}, headers=h)
    assert up.status_code == 200, up.text
    mid = up.json()["id"]
    assert client.get(f"/api/matches/{mid}/status", headers=h).json()["status"] == "completed"
    assert len(client.get(f"/api/matches/{mid}/scoreboard", headers=h).json()) == 10
    assert len(client.get(f"/api/matches/{mid}/mistakes", headers=h).json()) > 0
    assert client.get("/api/dashboard/overview", headers=h).status_code == 200
