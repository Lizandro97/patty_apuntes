"""Backend applies the same rules as packages/validation (shared vectors)."""

import json
from pathlib import Path

from app.validation.rules import (
    find_rows_missing_company,
    validate_company_name,
    validate_scale,
    validate_staff,
    validate_staff_names,
)

VECTORS = json.loads(
    (
        Path(__file__).resolve().parent.parent.parent.parent
        / "packages"
        / "validation"
        / "vectors.json"
    ).read_text()
)


def _code(err):
    return err["code"] if err else None


def test_missing_company_vectors():
    for v in VECTORS["missingCompany"]:
        assert find_rows_missing_company(v["rows"]) == v["expected"]


def test_staff_vectors():
    for v in VECTORS["staff"]:
        assert _code(validate_staff(v["input"])) == v["expected"]


def test_staff_names_vectors():
    for v in VECTORS["staffNames"]:
        assert _code(validate_staff_names(v["input"])) == v["expected"]


def test_scale_vectors():
    for v in VECTORS["scale"]:
        assert _code(validate_scale(v["start"], v["end"])) == v["expected"]


def test_company_name_vectors():
    for v in VECTORS["companyName"]:
        assert _code(validate_company_name(v["name"], v["existing"])) == v["expected"]
