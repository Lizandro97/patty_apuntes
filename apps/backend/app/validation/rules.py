"""Reglas save/export compartidas (espejo Python de packages/validation).

Conducta verificada con los mismos vectores JSON (vectors.json) en
tests/test_fase1_validation.py y bun test packages/. Cualquier cambio de
regla debe actualizar vectores + ambos lados a la vez.
"""


def find_rows_missing_company(rows: list[dict]) -> list[dict]:
    """Filas sin empresa. `row` es 1-based en el orden recibido."""
    out = []
    for i, f in enumerate(rows, 1):
        if not f.get("company_id"):
            out.append(
                {
                    "row": i,
                    "id": f.get("id"),
                    "field": "company",
                    "name": f.get("name_snapshot") or "",
                }
            )
    return out


def validate_staff(n) -> dict | None:
    if not isinstance(n, int) or isinstance(n, bool) or not 1 <= n <= 10:
        return {"code": "STAFF_RANGE", "message": "staff_count must be 1-10"}
    return None


def sanitize_staff_names(names) -> list[str]:
    """Nombres del equipo, posicionales: trim, max 24 caracteres, max 10.
    "" significa sin nombre (se muestra P{i+1}); se conservan posiciones."""
    if not isinstance(names, list):
        return []
    return [str(n or "").strip()[:24] for n in names[:10]]


def validate_staff_names(names) -> dict | None:
    if not isinstance(names, list) or len(names) > 10:
        return {"code": "STAFF_NAMES_INVALID", "message": "staff_names must be a list of max 10"}
    for n in names:
        if not isinstance(n, str) or len(n) > 24:
            return {"code": "STAFF_NAMES_INVALID", "message": "each name must be a string of max 24 chars"}
    return None


def validate_scale(start, end) -> dict | None:
    if (
        not isinstance(start, int)
        or not isinstance(end, int)
        or isinstance(start, bool)
        or isinstance(end, bool)
        or start > end
    ):
        return {"code": "INVALID_SCALE", "message": "Invalid year range"}
    if end - start > 20:
        return {"code": "SCALE_TOO_WIDE", "message": "Range too wide (max 20 years)"}
    return None


def validate_company_name(name: str, existing_lower: list[str]) -> dict | None:
    trimmed = (name or "").strip()
    if not trimmed:
        return {"code": "EMPTY_NAME", "message": "Empty name"}
    if trimmed.lower() in [e.lower() for e in existing_lower]:
        return {"code": "COMPANY_EXISTS", "message": "Company ya existe"}
    return None
