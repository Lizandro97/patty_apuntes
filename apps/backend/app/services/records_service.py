"""Domain service for files (records): rows, cells, scale, progress.

Moved verbatim from routers/records.py (Fase A) with two read-only
optimizations: _ensure_cells and row_stats use grouped queries instead
of N+1. No observable behavior change.
"""

from fastapi import HTTPException
from sqlalchemy import case, func
from sqlalchemy.orm import Session

from app.models.cell import Cell
from app.models.record import Record
from app.models.record_layout import RecordLayout
from app.models.record_row import RecordRow
from app.models.user import User
from app.sync.engine import touch_record
from app.validation.rules import find_rows_missing_company


def calc_progress(reviewed: int, total: int) -> int:
    # Aligned with the frontend's Math.round (half-up): 2/3 -> 67 on both.
    if not total:
        return 0
    return int(reviewed * 100 / total + 0.5)


def recalc_progress(db: Session, record_id: str):
    total = db.query(func.count(Cell.id)).filter(Cell.record_id == record_id).scalar() or 0
    rev = (
        db.query(func.count(Cell.id))
        .filter(Cell.record_id == record_id, Cell.reviewed.is_(True))
        .scalar()
        or 0
    )
    prog = calc_progress(rev, total)
    record = db.get(Record, record_id)
    if record:
        record.progress = prog
        db.commit()
    return prog, total, rev


def row_stats(db: Session, record_id: str) -> tuple[int, int, int]:
    """(total_rows, reviewed_rows, pending_rows) with 1 aggregate query (no N+1)."""
    agg = (
        db.query(
            Cell.row_id,
            func.count(Cell.id).label("total"),
            func.sum(case((Cell.reviewed.is_(True), 1), else_=0)).label("rev"),
        )
        .filter(Cell.record_id == record_id)
        .group_by(Cell.row_id)
        .all()
    )
    total_rows = len(agg)
    reviewed = sum(1 for _, t, r in agg if t > 0 and t == (r or 0))
    return total_rows, reviewed, total_rows - reviewed


def ensure_rows(db: Session, record: Record) -> list[RecordRow]:
    rows = (
        db.query(RecordRow)
        .filter(RecordRow.record_id == record.id)
        .order_by(RecordRow.position)
        .all()
    )
    if rows:
        return rows
    # default: 5 empty rows, no data — months work per row, empresa picked later
    for idx in range(5):
        db.add(
            RecordRow(
                record_id=record.id,
                company_id=None,
                name_snapshot="",
                position=idx,
            )
        )
    db.commit()
    return (
        db.query(RecordRow)
        .filter(RecordRow.record_id == record.id)
        .order_by(RecordRow.position)
        .all()
    )


def _missing_cell_keys(
    db: Session, record: Record, rows: list[RecordRow], years: list[int]
) -> set[tuple[str, int, int]]:
    existing = set(
        db.query(Cell.row_id, Cell.year, Cell.month).filter(Cell.record_id == record.id).all()
    )
    wanted = {(row.id, y, m) for row in rows for y in years for m in range(1, 13)}
    return wanted - existing


def ensure_cells(db: Session, record: Record, rows: list[RecordRow]):
    # create missing cells per row — months work with or without company.
    # Single query to find gaps (was: 1 query per cell, N+1).
    years = list(range(record.period_start, record.period_end + 1))
    if not rows or not years:
        return
    by_row = {row.id: row for row in rows}
    missing = _missing_cell_keys(db, record, rows, years)
    for row_id, y, m in sorted(missing):
        row = by_row[row_id]
        db.add(
            Cell(
                record_id=record.id,
                row_id=row_id,
                company_id=row.company_id,
                year=y,
                month=m,
            )
        )
    if missing:
        db.commit()


def sync_scale(db: Session, record: Record, old_start: int, old_end: int):
    # delete out-of-range
    db.query(Cell).filter(
        Cell.record_id == record.id,
        (Cell.year < record.period_start) | (Cell.year > record.period_end),
    ).delete(synchronize_session=False)
    # add missing years for each row (bulk detection, no N+1)
    rows = db.query(RecordRow).filter(RecordRow.record_id == record.id).all()
    new_years = [
        y for y in range(record.period_start, record.period_end + 1) if y < old_start or y > old_end
    ]
    if rows and new_years:
        by_row = {row.id: row for row in rows}
        missing = _missing_cell_keys(db, record, rows, new_years)
        for row_id, y, m in sorted(missing):
            row = by_row[row_id]
            db.add(
                Cell(
                    record_id=record.id,
                    row_id=row_id,
                    company_id=row.company_id,
                    year=y,
                    month=m,
                )
            )
    db.commit()


def ensure_live(db: Session, record: Record) -> list[RecordRow]:
    """Default ensure + touch only if it actually created rows/cells.

    GETs that materialize defaults (list_rows/cells/stats/export) also
    produce sync-visible data: without touch, pull would lose it.
    Known debt: writes on GET; only materializes defaults, never edits.
    """
    rows_before = (
        db.query(func.count(RecordRow.id)).filter(RecordRow.record_id == record.id).scalar() or 0
    )
    cells_before = db.query(func.count(Cell.id)).filter(Cell.record_id == record.id).scalar() or 0
    rows = ensure_rows(db, record)
    ensure_cells(db, record, rows)
    rows_after = (
        db.query(func.count(RecordRow.id)).filter(RecordRow.record_id == record.id).scalar() or 0
    )
    cells_after = db.query(func.count(Cell.id)).filter(Cell.record_id == record.id).scalar() or 0
    if rows_after != rows_before or cells_after != cells_before:
        touch_record(db, record)
    return (
        db.query(RecordRow)
        .filter(RecordRow.record_id == record.id)
        .order_by(RecordRow.position)
        .all()
    )


def require_record(record_id: str, db: Session, user: User) -> Record:
    a = (
        db.query(Record)
        .filter(Record.id == record_id, Record.user_id == user.id, Record.deleted_at.is_(None))
        .first()
    )
    if not a:
        raise HTTPException(404, {"code": "RECORD_NOT_FOUND", "message": "Not found"})
    return a


def missing_fields(rows: list[RecordRow]) -> list[dict]:
    """Required fields for save/export: every row needs a registered company."""
    ordered = sorted(rows, key=lambda f: f.position)
    return find_rows_missing_company(
        [
            {"id": r.id, "company_id": r.company_id, "name_snapshot": r.name_snapshot}
            for r in ordered
        ]
    )


def remap_layout_rows(payload: dict, rows: list[RecordRow], new_rows: list[RecordRow]) -> dict:
    """Reassign heights by position; non-row keys (e.g. header) untouched.

    Aligned with packages/document-model remapLayoutRows: stale ids
    inside `rows` are dropped (they reference no existing rows);
    top-level non-row keys (e.g. header) are preserved.
    """
    if not isinstance(payload.get("rows"), dict):
        return payload
    new_by_position = {f.position: f.id for f in new_rows}
    remapped = {}
    for f in rows:
        v = payload["rows"].get(f.id)
        if v is not None and f.position in new_by_position:
            remapped[new_by_position[f.position]] = v
    return {**payload, "rows": remapped}


def duplicate_record(db: Session, orig: Record, user_id: str) -> Record:
    a = Record(
        user_id=user_id,
        title=orig.title + " (copia)",
        review_type=orig.review_type,
        period_start=orig.period_start,
        period_end=orig.period_end,
    )
    db.add(a)
    db.flush()
    rows = (
        db.query(RecordRow)
        .filter(RecordRow.record_id == orig.id)
        .order_by(RecordRow.position)
        .all()
    )
    for f in rows:
        db.add(
            RecordRow(
                record_id=a.id,
                company_id=f.company_id,
                name_snapshot=f.name_snapshot,
                position=f.position,
                assignee=f.assignee,
                note=f.note,
            )
        )
    db.flush()
    # copy each row with its own month cells (fresh revision: unchecked)
    new_rows = (
        db.query(RecordRow).filter(RecordRow.record_id == a.id).order_by(RecordRow.position).all()
    )
    old_cells = db.query(Cell).filter(Cell.record_id == orig.id).all()
    old_by_row: dict = {}
    for c in old_cells:
        old_by_row.setdefault(c.row_id, []).append(c)
    old_by_position = {f.position: f.id for f in rows}
    for new_row in new_rows:
        for c in old_by_row.get(old_by_position.get(new_row.position), []):
            db.add(
                Cell(
                    record_id=a.id,
                    row_id=new_row.id,
                    company_id=new_row.company_id,
                    year=c.year,
                    month=c.month,
                    reviewed=False,
                    assignee=c.assignee,
                    color=c.color,
                    style=c.style,
                )
            )
    db.flush()
    # Copy the visual design (sheet + table; per-row heights reassigned by
    # position, non-row keys —e.g. "header"— preserved verbatim)
    for d in db.query(RecordLayout).filter(RecordLayout.record_id == orig.id).all():
        payload = d.payload if isinstance(d.payload, dict) else {}
        if d.section == "table":
            payload = remap_layout_rows(payload, rows, new_rows)
        db.add(RecordLayout(record_id=a.id, section=d.section, payload=payload))
    db.flush()
    recalc_progress(db, a.id)
    db.refresh(a)
    touch_record(db, a)
    return a
