"""Resolve merge/mine/theirs on an LWW conflict."""

from datetime import UTC, datetime, timedelta

from tests.conftest import auth_headers, client

NOW = datetime.now(UTC)


def _doc(title, updated, rows, cells, uuid="m1"):
    return {
        "client_uuid": uuid,
        "type": "review",
        "title": title,
        "metadata": {"review_type": ""},
        "period_start": 2024,
        "period_end": 2024,
        "staff_count": 2,
        "sections": rows,
        "content": cells,
        "layout": {"sheet": {}, "table": {}},
        "created_at": NOW.isoformat(),
        "updated_at": updated,
        "device_id": "dev-a",
    }


def _row(uuid, pos, name="F"):
    return {
        "client_uuid": uuid,
        "company_id": "c",
        "name_snapshot": name,
        "position": pos,
    }


def _cell(row, month, reviewed, color="#0072B2"):
    return {"row_uuid": row, "year": 2024, "month": month, "reviewed": reviewed, "color": color}


def test_merge_combines_reviewed_cells_from_both_sides():
    h = auth_headers("mg@t.com")
    t_new = NOW.isoformat()
    t_old = (NOW - timedelta(hours=1)).isoformat()
    # Servidor: fila f1 con enero marcado.
    r = client.post(
        "/api/sync/push",
        json={"changes": [_doc("Srv", t_new, [_row("f1", 0)], [_cell("f1", 1, True)])]},
        headers=h,
    )
    assert r.json()["accepted"], r.text
    # Conflicto: movil viejo con febrero marcado.
    r = client.post(
        "/api/sync/push",
        json={"changes": [_doc("Mov", t_old, [_row("f1", 0)], [_cell("f1", 2, True, "#E69F00")])]},
        headers=h,
    )
    assert len(r.json()["conflicts"]) == 1
    # Merge: conserva ambos marcados (el movil reenvia su version).
    m = client.post(
        "/api/sync/resolve",
        json={
            "client_uuid": "m1",
            "strategy": "merge",
            "doc": _doc("Mov", t_old, [_row("f1", 0)], [_cell("f1", 2, True, "#E69F00")]),
        },
        headers=h,
    )
    assert m.status_code == 200, m.text
    merged = m.json()["doc"]
    marks = {(c["month"], c["reviewed"]) for c in merged["content"]}
    assert (1, True) in marks and (2, True) in marks
    assert merged["title"] == "Srv"  # metadata del mas nuevo


def test_mine_overwrites_and_theirs_keeps_server():
    h = auth_headers("mg2@t.com")
    t_new = NOW.isoformat()
    t_old = (NOW - timedelta(hours=1)).isoformat()
    client.post(
        "/api/sync/push",
        json={"changes": [_doc("Srv", t_new, [_row("g1", 0)], [], uuid="m2")]},
        headers=h,
    )
    client.post(
        "/api/sync/push",
        json={"changes": [_doc("Mov", t_old, [_row("g1", 0)], [], uuid="m2")]},
        headers=h,
    )
    m = client.post(
        "/api/sync/resolve",
        json={
            "client_uuid": "m2",
            "strategy": "mine",
            "doc": _doc("Mov", t_old, [_row("g1", 0)], [], uuid="m2"),
        },
        headers=h,
    )
    assert m.json()["doc"]["title"] == "Mov"
    # Conflicto nuevo + theirs conserva servidor.
    client.post(
        "/api/sync/push",
        json={"changes": [_doc("Otro", t_old, [_row("g1", 0)], [], uuid="m2")]},
        headers=h,
    )
    t = client.post(
        "/api/sync/resolve", json={"client_uuid": "m2", "strategy": "theirs"}, headers=h
    )
    assert t.json()["doc"]["title"] == "Mov"
