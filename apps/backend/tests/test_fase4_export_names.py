"""Fase 4: sanitized {slug}-{date} filenames, no path traversal."""

from app.export.filenames import export_filename, slugify
from tests.conftest import auth_headers, client


def test_slugify_parity():
    assert slugify("Revisión Ñoño 2024") == "revision-nono-2024"
    assert slugify("") == "archivo"
    assert slugify("../../../etc/passwd") == "etc-passwd"
    assert len(slugify("a" * 100)) <= 60


def test_export_filename_shape():
    import re

    assert re.match(r"^t-\d{4}-\d{2}-\d{2}\.pdf$", export_filename("T", "pdf"))
    assert export_filename("T", "xlsx").endswith(".xlsx")


def test_export_content_disposition_uses_slug_date():
    h = auth_headers("fn@t.com")
    rid = client.post(
        "/api/records",
        json={"title": "Mi Revisión 2024", "period_start": 2024, "period_end": 2024},
        headers=h,
    ).json()["id"]
    comp = client.post("/api/companies", json={"name": "C1"}, headers=h).json()
    for row in client.get(f"/api/records/{rid}/rows", headers=h).json():
        client.put(
            f"/api/records/{rid}/rows/{row['id']}",
            json={"company_id": comp["id"]},
            headers=h,
        )
    r = client.get(f"/api/records/{rid}/export?format=pdf", headers=h)
    assert r.status_code == 200
    cd = r.headers["content-disposition"]
    assert "mi-revision-2024-" in cd and cd.rstrip('"').endswith(".pdf")
    assert "filename=revision-" not in cd and rid not in cd
