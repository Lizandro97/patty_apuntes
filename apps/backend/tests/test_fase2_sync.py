"""Fase 2: push/pull idempotente, tombstones, LWW determinista, corte tolerado."""

from datetime import UTC, datetime, timedelta

from tests.conftest import auth_headers, client

NOW = datetime.now(UTC)


def _doc(client_uuid: str, updated_at: str, title: str = "D", rows=1) -> dict:
    return {
        "client_uuid": client_uuid,
        "type": "review",
        "title": title,
        "metadata": {"review_type": ""},
        "period_start": 2024,
        "period_end": 2024,
        "staff_count": 2,
        "sections": [
            {
                "client_uuid": f"{client_uuid}-f{i}",
                "company_id": None,
                "name_snapshot": f"F{i}",
                "position": i,
            }
            for i in range(rows)
        ],
        "content": [],
        "layout": {"sheet": {}, "table": {}},
        "created_at": NOW.isoformat(),
        "updated_at": updated_at,
        "revision": 0,
        "device_id": "dev-a",
        "sync_status": "dirty",
        "last_synced_revision": 0,
    }


def _push(h: dict, docs: list[dict]):
    return client.post("/api/sync/push", json={"changes": docs}, headers=h)


def _pull(h: dict, since: int = 0):
    r = client.get(f"/api/sync/pull?since_revision={since}", headers=h)
    assert r.status_code == 200, r.text
    return r.json()


def test_push_then_pull_roundtrip():
    h = auth_headers("s1@t.com")
    t = NOW.isoformat()
    r = _push(h, [_doc("d1", t)])
    assert r.status_code == 200, r.text
    assert len(r.json()["accepted"]) == 1
    assert r.json()["conflicts"] == []

    pulled = _pull(h, 0)
    assert pulled["current_revision"] >= 1
    got = [d for d in pulled["changes"] if d["client_uuid"] == "d1"]
    assert len(got) == 1
    assert got[0]["title"] == "D"
    assert got[0]["sync_status"] == "clean"


def test_push_idempotent_no_duplicates():
    h = auth_headers("s2@t.com")
    t = NOW.isoformat()
    assert _push(h, [_doc("dd", t)]).status_code == 200
    r2 = _push(h, [_doc("dd", t)])
    assert r2.status_code == 200
    pulled = _pull(h, 0)
    assert len([d for d in pulled["changes"] if d["client_uuid"] == "dd"]) == 1


def test_partial_batch_retry_without_loss():
    h = auth_headers("s3@t.com")
    old = (NOW - timedelta(hours=1)).isoformat()
    new = NOW.isoformat()
    # d-conf ya existe en servidor mas nuevo -> conflicto; d-ok se acepta.
    assert _push(h, [_doc("d-conf", new)]).status_code == 200
    r = _push(h, [_doc("d-conf", old, title="Viejo"), _doc("d-ok", new)])
    body = r.json()
    assert r.status_code == 200
    assert [a["client_uuid"] for a in body["accepted"]] == ["d-ok"]
    assert [c["client_uuid"] for c in body["conflicts"]] == ["d-conf"]
    # Reintento identico: mismo resultado, sin duplicar ni perder.
    r2 = _push(h, [_doc("d-conf", old, title="Viejo"), _doc("d-ok", new)])
    assert [a["client_uuid"] for a in r2.json()["accepted"]] == ["d-ok"]
    pulled = _pull(h, 0)
    assert [d["title"] for d in pulled["changes"] if d["client_uuid"] == "d-conf"] == ["D"]


def test_lww_newer_wins_and_tiebreak_device():
    h = auth_headers("s4@t.com")
    t1 = (NOW - timedelta(minutes=5)).isoformat()
    t2 = NOW.isoformat()
    assert _push(h, [_doc("lw", t2)]).status_code == 200
    r = _push(h, [_doc("lw", t1, title="Viejo")])
    assert len(r.json()["conflicts"]) == 1
    assert r.json()["conflicts"][0]["server_doc"]["title"] == "D"
    # Mismo timestamp, device mayor gana.
    doc = _doc("lw", t2, title="Empate")
    doc["device_id"] = "dev-zzz"
    r2 = _push(h, [doc])
    assert [a["client_uuid"] for a in r2.json()["accepted"]] == ["lw"]
    pulled = _pull(h, 0)
    assert [d["title"] for d in pulled["changes"] if d["client_uuid"] == "lw"] == ["Empate"]


def test_delete_becomes_tombstone_visible_in_pull_not_in_list():
    h = auth_headers("s5@t.com")
    rid = client.post(
        "/api/records",
        json={"title": "Borrar", "period_start": 2024, "period_end": 2024},
        headers=h,
    ).json()["id"]
    assert client.delete(f"/api/records/{rid}", headers=h).status_code == 200
    assert client.get(f"/api/records/{rid}", headers=h).status_code == 404
    assert rid not in [a["id"] for a in client.get("/api/records", headers=h).json()]
    pulled = _pull(h, 0)
    tombs = [d for d in pulled["changes"] if d.get("deleted_at")]
    assert tombs, "el borrado debe viajar como tombstone"


def test_web_change_visible_via_pull():
    h = auth_headers("s6@t.com")
    t = NOW.isoformat()
    _push(h, [_doc("w1", t)])
    rev = _pull(h, 0)["current_revision"]
    rid = client.get("/api/records", headers=h).json()[0]["id"]
    client.put(f"/api/records/{rid}", json={"title": "WebEdit"}, headers=h)
    changes = _pull(h, rev)["changes"]
    assert [d["title"] for d in changes if d["client_uuid"] == "w1"] == ["WebEdit"]


def test_sync_requires_auth_and_paginates():
    assert client.get("/api/sync/pull?since_revision=0").status_code == 401
    assert client.post("/api/sync/push", json={"changes": []}).status_code == 401
    h = auth_headers("s7@t.com")
    r = client.get("/api/sync/pull?since_revision=0&limit=1", headers=h)
    assert r.status_code == 200
    assert "has_more" in r.json()
    assert client.get("/api/sync/status", headers=h).json()["current_revision"] >= 0
