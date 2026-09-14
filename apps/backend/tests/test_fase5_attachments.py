"""Fase 5: adjuntos (upload/list/content, dedup, MIME, tamano, PDF con imagen)."""

import io

from PIL import Image

from tests.conftest import auth_headers, client


def _png_bytes() -> bytes:
    buf = io.BytesIO()
    Image.new("RGB", (4, 4), (255, 0, 0)).save(buf, format="PNG")
    return buf.getvalue()


PNG_1PX = _png_bytes()


def _record(h: dict) -> str:
    return client.post(
        "/api/records",
        json={"title": "Adj", "period_start": 2024, "period_end": 2024},
        headers=h,
    ).json()["id"]


def _upload(h: dict, rid: str, data: bytes = PNG_1PX, name: str = "f.png"):
    return client.post(
        f"/api/records/{rid}/attachments",
        files={"file": (name, io.BytesIO(data), "image/png")},
        headers=h,
    )


def test_upload_list_content_and_dedup():
    h = auth_headers("att@t.com")
    rid = _record(h)
    r1 = _upload(h, rid)
    assert r1.status_code == 200, r1.text
    assert r1.json()["dedup"] is False
    r2 = _upload(h, rid)
    assert r2.json()["dedup"] is True
    assert r2.json()["id"] == r1.json()["id"]

    lst = client.get(f"/api/records/{rid}/attachments", headers=h).json()
    assert len(lst) == 1
    assert lst[0]["mime"] == "image/png"

    c = client.get(f"/api/attachments/{r1.json()['id']}/content", headers=h)
    assert c.status_code == 200
    assert c.content == PNG_1PX


def test_mime_and_size_rejected():
    h = auth_headers("att2@t.com")
    rid = _record(h)
    bad = client.post(
        f"/api/records/{rid}/attachments",
        files={"file": ("x.exe", io.BytesIO(b"MZ"), "application/x-msdownload")},
        headers=h,
    )
    assert bad.status_code == 400
    big = client.post(
        f"/api/records/{rid}/attachments",
        files={"file": ("b.png", io.BytesIO(b"0" * (11 * 1024 * 1024)), "image/png")},
        headers=h,
    )
    assert big.status_code in (400, 413)


def test_pdf_with_image_is_bigger():
    h = auth_headers("att3@t.com")
    rid = _record(h)
    comp = client.post("/api/companies", json={"name": "C1"}, headers=h).json()
    for row in client.get(f"/api/records/{rid}/rows", headers=h).json():
        client.put(
            f"/api/records/{rid}/rows/{row['id']}",
            json={"company_id": comp["id"]},
            headers=h,
        )
    plain = client.get(f"/api/records/{rid}/export?format=pdf", headers=h).content
    _upload(h, rid)
    assert len(_upload(h, rid).json()) > 0
    with_img = client.get(f"/api/records/{rid}/export?format=pdf", headers=h).content
    assert len(with_img) > len(plain)
