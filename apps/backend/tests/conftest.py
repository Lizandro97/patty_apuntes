"""Test isolation: temp sqlite DB via env BEFORE importing the app.

Without this, importing app.main would run the destructive block against the real patty.db.
"""

import os
import tempfile

_tmp = tempfile.mkdtemp(prefix="foliora-test-")
os.environ["DATABASE_URL"] = f"sqlite:///{_tmp}/test.db"
os.environ["ATTACH_DIR"] = f"{_tmp}/uploads"

from fastapi.testclient import TestClient  # noqa: E402

from app.db.session import Base, engine  # noqa: E402
from app.main import app  # noqa: E402

Base.metadata.create_all(bind=engine)

client = TestClient(app)


def auth_headers(email: str = "t@t.com", password: str = "pass1234") -> dict:
    client.post(
        "/api/auth/register",
        json={"email": email, "password": password, "full_name": "T"},
    )
    r = client.post("/api/auth/login", json={"email": email, "password": password})
    assert r.status_code == 200, r.text
    return {"Authorization": f"Bearer {r.json()['access_token']}"}
