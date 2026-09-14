"""Sanitized filenames (mirror of frontend/lib/filenames.ts).

{slug}-{yyyy-mm-dd}.{ext}: no path traversal, no id collisions.
"""

import re
import unicodedata
from datetime import date


def slugify(s: str) -> str:
    base = (s or "archivo").strip() or "archivo"
    base = "".join(c for c in unicodedata.normalize("NFD", base) if not unicodedata.combining(c))
    base = base.lower()
    base = re.sub(r"[^a-z0-9]+", "-", base).strip("-")
    return base[:60] or "archivo"


def export_filename(title: str, ext: str) -> str:
    today = date.today().isoformat()
    return f"{slugify(title)}-{today}.{ext}"
