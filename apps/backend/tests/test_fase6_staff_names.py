"""Fase 6: staff_names por archivo (sincronizado, validado, LWW)."""

from datetime import UTC, datetime

from tests.conftest import auth_headers, client

NOW = datetime.now(UTC)


def _doc(client_uuid: str, updated_at: str, **kw) -> dict:
    d = {
        "client_uuid": client_uuid,
        "type": "review",
        "title": "N",
        "metadata": {"review_type": ""},
        "period_start": 2024,
        "period_end": 2024,
        "staff_count": 2,
        "staff_names": ["Ana", "Luis"],
        "sections": [],
        "content": [],
        "layout": {"sheet": {}, "table": {}},
        "created_at": NOW.isoformat(),
        "updated_at": updated_at,
        "revision": 0,
        "device_id": "dev-a",
        "sync_status": "dirty",
        "last_synced_revision": 0,
    }
    d.update(kw)
    return d


def test_push_pull_staff_names_roundtrip():
    h = auth_headers("s6@t.com")
    t = NOW.isoformat()
    r = client.post("/api/sync/push", json={"changes": [_doc("n1", t)]}, headers=h)
    assert r.status_code == 200, r.text
    assert len(r.json()["accepted"]) == 1

    pulled = client.get("/api/sync/pull?since_revision=0", headers=h).json()
    got = [d for d in pulled["changes"] if d["client_uuid"] == "n1"]
    assert len(got) == 1
    assert got[0]["staff_names"] == ["Ana", "Luis"]


def test_put_validates_and_sanitizes_names():
    h = auth_headers("s6b@t.com")
    r = client.post("/api/records", json={"title": "R"}, headers=h)
    assert r.status_code == 200, r.text
    rid = r.json()["id"]
    assert r.json()["staff_names"] == []

    r = client.put(f"/api/records/{rid}", json={"staff_names": ["  Ana  ", "Luis"]}, headers=h)
    assert r.status_code == 200, r.text
    assert r.json()["staff_names"] == ["Ana", "Luis"]

    r = client.put(f"/api/records/{rid}", json={"staff_names": ["Ana", ""]}, headers=h)
    assert r.status_code == 200, r.text
    assert r.json()["staff_names"] == ["Ana", ""]

    r = client.put(f"/api/records/{rid}", json={"staff_names": ["x"] * 11}, headers=h)
    assert r.status_code == 400
    assert r.json()["detail"]["code"] == "STAFF_NAMES_INVALID"
