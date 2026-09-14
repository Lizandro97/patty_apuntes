"""Fase A: services layer + aligned TS/Python contracts + device scoping."""

from types import SimpleNamespace

from app.services.export_service import MAX_EXPORT_YEARS, strings, years_for
from app.services.records_service import (
    calc_progress,
    missing_fields,
    remap_layout_rows,
)
from app.validation.rules import sanitize_staff_names
from tests.conftest import auth_headers, client


def _row(id, position):
    return SimpleNamespace(id=id, position=position)


def test_calc_progress_half_up_like_math_round():
    assert calc_progress(0, 0) == 0
    assert calc_progress(1, 2) == 50
    assert calc_progress(2, 3) == 67  # Math.round(66.67) — antes int() daba 66
    assert calc_progress(1, 3) == 33
    assert calc_progress(3, 3) == 100


def test_sanitize_parity_ts_strings_only():
    assert sanitize_staff_names([0, False, None, 123, " Ana ", "x" * 30]) == [
        "",
        "",
        "",
        "",
        "Ana",
        "x" * 24,
    ]
    assert sanitize_staff_names("no-lista") == []
    assert sanitize_staff_names(["a", "b"] * 6) == ["a", "b"] * 5


def test_remap_drops_stale_and_keeps_header():
    rows = [_row("f1", 0), _row("f2", 1)]
    new_rows = [_row("n1", 0), _row("n2", 1)]
    out = remap_layout_rows(
        {"rows": {"f1": {"h": 30}, "f9": {"h": 9}}, "header": {"h": 44}},
        rows,  # type: ignore[arg-type]
        new_rows,  # type: ignore[arg-type]
    )
    assert out == {"rows": {"n1": {"h": 30}}, "header": {"h": 44}}


def test_missing_fields_requires_company():
    rows = [
        SimpleNamespace(id="a", company_id="c1", name_snapshot="A", position=0),
        SimpleNamespace(id="b", company_id=None, name_snapshot="", position=1),
    ]
    got = missing_fields(rows)  # type: ignore[arg-type]
    assert [m["id"] for m in got] == ["b"]
    assert got[0]["row"] == 2


def test_export_strings_and_limit():
    assert strings("es")["months"][0] == "E"
    assert strings("en")["months"][0] == "J"
    assert strings("xx")["months"][0] == "E"  # fallback es
    rec = SimpleNamespace(period_start=2020, period_end=2024)
    assert years_for(rec) == [2020, 2021, 2022, 2023, 2024]  # type: ignore[arg-type]
    assert MAX_EXPORT_YEARS == 20


def test_resolve_strategy_invalid_422():
    h = auth_headers("fa@t.com")
    r = client.post(
        "/api/sync/resolve",
        json={"client_uuid": "x", "strategy": "bogus", "doc": {}},
        headers=h,
    )
    assert r.status_code == 422


def test_devices_scoped_per_user():
    ha = auth_headers("fa-dev-a@t.com")
    hb = auth_headers("fa-dev-b@t.com")
    pt = client.post("/api/sync/devices/pairing", headers=ha).json()["pairing_token"]
    dev = client.post("/api/sync/devices/claim", json={"pairing_token": pt, "name": "cel"}).json()[
        "device_id"
    ]
    assert [d["id"] for d in client.get("/api/sync/devices", headers=ha).json()] == [dev]
    assert client.get("/api/sync/devices", headers=hb).json() == []
    # B cannot revoke A device.
    assert client.post(f"/api/sync/devices/{dev}/revoke", headers=hb).status_code == 404
    assert client.post(f"/api/sync/devices/{dev}/revoke", headers=ha).status_code == 200
