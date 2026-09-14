"""Fase 4: refresh JWT, rate-limit login, pairing 1 uso, revoke devices."""

from tests.conftest import auth_headers, client


def _register(email: str):
    client.post(
        "/api/auth/register",
        json={"email": email, "password": "pass1234", "full_name": "T"},
    )


def test_login_returns_access_and_refresh():
    _register("ref@t.com")
    r = client.post("/api/auth/login", json={"email": "ref@t.com", "password": "pass1234"})
    assert r.status_code == 200, r.text
    body = r.json()
    assert body["access_token"] and body["refresh_token"]
    assert body["token_type"] == "bearer"


def test_refresh_issues_new_access():
    _register("ref2@t.com")
    tokens = client.post(
        "/api/auth/login", json={"email": "ref2@t.com", "password": "pass1234"}
    ).json()
    r = client.post("/api/auth/refresh", json={"refresh_token": tokens["refresh_token"]})
    assert r.status_code == 200, r.text
    me = client.get("/api/auth/me", headers={"Authorization": f"Bearer {r.json()['access_token']}"})
    assert me.status_code == 200


def test_access_token_is_short_lived_default():
    from app.core.config import settings

    assert settings.ACCESS_TOKEN_EXPIRE_MINUTES <= 30


def test_login_rate_limited():
    _register("rl@t.com")
    r = None
    for _ in range(12):
        r = client.post("/api/auth/login", json={"email": "rl@t.com", "password": "wrong-pass"})
    assert r is not None and r.status_code == 429
    assert r.json()["detail"]["code"] == "RATE_LIMITED"


def test_pairing_claim_and_revoke():
    h = auth_headers("pair@t.com")
    p = client.post("/api/sync/devices/pairing", headers=h)
    assert p.status_code == 200, p.text
    token = p.json()["pairing_token"]
    c = client.post("/api/sync/devices/claim", json={"pairing_token": token, "name": "Pixel"})
    assert c.status_code == 200, c.text
    device_id = c.json()["device_id"]
    # Un solo uso.
    c2 = client.post("/api/sync/devices/claim", json={"pairing_token": token, "name": "Otro"})
    assert c2.status_code == 400
    # Revoke.
    r = client.post(f"/api/sync/devices/{device_id}/revoke", headers=h)
    assert r.status_code == 200
    devs = client.get("/api/sync/devices", headers=h).json()
    assert [d for d in devs if d["id"] == device_id][0]["revoked"] is True
