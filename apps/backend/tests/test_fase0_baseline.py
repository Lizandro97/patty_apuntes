"""Fase 0: non-destructive startup + frozen API contract."""

from sqlalchemy import func

from app.db.init import init_db
from app.db.session import SessionLocal
from app.models.record import Record
from app.models.user import User
from tests.conftest import auth_headers, client


def test_double_startup_preserves_data():
    h = auth_headers("doble@t.com")
    r = client.post(
        "/api/records",
        json={"title": "No borrar", "period_start": 2024, "period_end": 2024},
        headers=h,
    )
    assert r.status_code == 200, r.text
    record_id = r.json()["id"]

    # Second startup: must be idempotent and preserve rows.
    init_db()
    init_db()

    db = SessionLocal()
    try:
        assert db.get(User, db.query(User).filter(User.email == "doble@t.com").first().id)
        assert db.get(Record, record_id) is not None
        assert db.query(func.count(Record.id)).scalar() >= 1
    finally:
        db.close()


def test_health():
    assert client.get("/health").json() == {"ok": True}
    assert client.get("/api/health").json() == {"ok": True}


def test_auth_me_requires_token():
    assert client.get("/api/auth/me").status_code == 401


def test_register_login_me():
    h = auth_headers("yo@t.com")
    r = client.get("/api/auth/me", headers=h)
    assert r.status_code == 200
    assert r.json()["email"] == "yo@t.com"


def test_records_crud():
    h = auth_headers("rec@t.com")
    c = client.post(
        "/api/records",
        json={"title": "R1", "period_start": 2024, "period_end": 2025, "staff_count": 3},
        headers=h,
    ).json()
    assert c["title"] == "R1"
    assert c["staff_count"] == 3
    rid = c["id"]

    assert client.get(f"/api/records/{rid}", headers=h).json()["id"] == rid
    u = client.put(f"/api/records/{rid}", json={"title": "R2"}, headers=h).json()
    assert u["title"] == "R2"
    ids = [a["id"] for a in client.get("/api/records", headers=h).json()]
    assert rid in ids


def test_companies_crud_and_duplicate():
    h = auth_headers("emp@t.com")
    e = client.post("/api/companies", json={"name": "Acme"}, headers=h).json()
    assert e["name"] == "Acme"
    dup = client.post("/api/companies", json={"name": "Acme"}, headers=h)
    assert dup.status_code == 400
    assert dup.json()["detail"]["code"] == "COMPANY_EXISTS"
    u = client.put(f"/api/companies/{e['id']}", json={"name": "Acme2"}, headers=h).json()
    assert u["name"] == "Acme2"
    assert client.delete(f"/api/companies/{e['id']}", headers=h).status_code == 200


def test_settings_get_put():
    h = auth_headers("cfg@t.com")
    g = client.get("/api/settings", headers=h)
    assert g.status_code == 200
    assert g.json()["language"] == "es"
    p = client.put("/api/settings", json={"language": "en"}, headers=h).json()
    assert p["language"] == "en"


def _record_with_companies(h: dict) -> str:
    rid = client.post(
        "/api/records",
        json={"title": "Exp", "period_start": 2024, "period_end": 2024},
        headers=h,
    ).json()["id"]
    comp = client.post("/api/companies", json={"name": "C1"}, headers=h).json()
    rows = client.get(f"/api/records/{rid}/rows", headers=h).json()
    assert len(rows) == 5
    for row in rows:
        r = client.put(
            f"/api/records/{rid}/rows/{row['id']}",
            json={"company_id": comp["id"]},
            headers=h,
        )
        assert r.status_code == 200, r.text
    return rid


def test_export_requires_company_422():
    h = auth_headers("exp422@t.com")
    rid = client.post(
        "/api/records",
        json={"title": "SinEmp", "period_start": 2024, "period_end": 2024},
        headers=h,
    ).json()["id"]
    r = client.get(f"/api/records/{rid}/export?format=pdf", headers=h)
    assert r.status_code == 422
    assert r.json()["detail"]["code"] == "EXPORT_MISSING_FIELDS"


def test_export_pdf_excel_200():
    h = auth_headers("exp@t.com")
    rid = _record_with_companies(h)
    pdf = client.get(f"/api/records/{rid}/export?format=pdf&lang=es", headers=h)
    assert pdf.status_code == 200
    assert "application/pdf" in pdf.headers["content-type"]
    xls = client.get(f"/api/records/{rid}/export?format=excel&lang=es", headers=h)
    assert xls.status_code == 200
    assert "spreadsheetml" in xls.headers["content-type"]
