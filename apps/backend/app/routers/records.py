from datetime import UTC, datetime

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import func
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.models.cell import Cell
from app.models.company import Company
from app.models.record import Record
from app.models.record_layout import RecordLayout
from app.models.record_row import RecordRow
from app.models.user import User
from app.routers.deps import get_current_user
from app.schemas.record import (
    CellBulkUpdate,
    CellOut,
    CellUpdate,
    LayoutOut,
    LayoutUpdate,
    RecordCreate,
    RecordOut,
    RecordRowCreate,
    RecordRowOut,
    RecordRowUpdate,
    RecordUpdate,
)
from app.services import records_service
from app.services.export_service import MAX_EXPORT_YEARS, build_excel, build_pdf, strings
from app.sync.engine import touch_record
from app.validation.rules import (
    sanitize_staff_names,
    validate_scale,
    validate_staff,
    validate_staff_names,
)

router = APIRouter(prefix="/records", tags=["records"])


# ---------- Archivos ----------
@router.get("", response_model=list[RecordOut])
def list_records(db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    return (
        db.query(Record)
        .filter(Record.user_id == user.id, Record.deleted_at.is_(None))
        .order_by(Record.updated_at.desc())
        .all()
    )


@router.post("", response_model=RecordOut)
def create(
    data: RecordCreate, db: Session = Depends(get_db), user: User = Depends(get_current_user)
):
    a = Record(
        user_id=user.id,
        title=data.title,
        review_type=data.review_type,
        period_start=data.period_start,
        period_end=data.period_end,
        staff_count=data.staff_count or 2,
        staff_names=sanitize_staff_names(data.staff_names),
    )
    db.add(a)
    db.commit()
    db.refresh(a)
    rows = records_service.ensure_rows(db, a)
    if rows:
        records_service.ensure_cells(db, a, rows)
        records_service.recalc_progress(db, a.id)
        db.refresh(a)
    touch_record(db, a)
    return a


@router.get("/{record_id}", response_model=RecordOut)
def get_one(record_id: str, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    a = (
        db.query(Record)
        .filter(Record.id == record_id, Record.user_id == user.id, Record.deleted_at.is_(None))
        .first()
    )
    if not a:
        raise HTTPException(404, {"code": "RECORD_NOT_FOUND", "message": "Not found"})
    return a


@router.put("/{record_id}", response_model=RecordOut)
def update(
    record_id: str,
    data: RecordUpdate,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    a = (
        db.query(Record)
        .filter(Record.id == record_id, Record.user_id == user.id, Record.deleted_at.is_(None))
        .first()
    )
    if not a:
        raise HTTPException(404, {"code": "RECORD_NOT_FOUND", "message": "Not found"})
    old_start, old_end = a.period_start, a.period_end
    if data.title is not None:
        a.title = data.title
    if data.review_type is not None:
        a.review_type = data.review_type
    if data.staff_count is not None:
        err = validate_staff(data.staff_count)
        if err:
            raise HTTPException(400, {"code": err["code"], "message": err["message"]})
        a.staff_count = data.staff_count
    if data.staff_names is not None:
        err = validate_staff_names(data.staff_names)
        if err:
            raise HTTPException(400, {"code": err["code"], "message": err["message"]})
        a.staff_names = sanitize_staff_names(data.staff_names)
    scale_changed = False
    if data.period_start is not None and data.period_start != a.period_start:
        a.period_start = data.period_start
        scale_changed = True
    if data.period_end is not None and data.period_end != a.period_end:
        a.period_end = data.period_end
        scale_changed = True
    err = validate_scale(a.period_start, a.period_end)
    if err and (scale_changed or err["code"] == "INVALID_SCALE"):
        raise HTTPException(400, {"code": err["code"], "message": err["message"]})
    db.commit()
    db.refresh(a)
    if scale_changed:
        records_service.sync_scale(db, a, old_start, old_end)
    touch_record(db, a)
    return a


LAYOUT_SECTIONS = ("sheet", "table")


def _require_record(record_id: str, db: Session, user: User) -> Record:
    return records_service.require_record(record_id, db, user)


@router.get("/{record_id}/layout", response_model=list[LayoutOut])
def get_layout(
    record_id: str, db: Session = Depends(get_db), user: User = Depends(get_current_user)
):
    _require_record(record_id, db, user)
    return (
        db.query(RecordLayout)
        .filter(RecordLayout.record_id == record_id, RecordLayout.section.in_(LAYOUT_SECTIONS))
        .all()
    )


@router.put("/{record_id}/layout", response_model=LayoutOut)
def put_layout(
    record_id: str,
    data: LayoutUpdate,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    record = _require_record(record_id, db, user)
    if data.section not in LAYOUT_SECTIONS:
        raise HTTPException(
            400, {"code": "SECTION_INVALID", "message": "section must be 'sheet' or 'table'"}
        )
    if not isinstance(data.payload, dict) or len(data.payload) > 500:
        raise HTTPException(400, {"code": "PAYLOAD_INVALID", "message": "Invalid payload"})
    row = (
        db.query(RecordLayout)
        .filter(RecordLayout.record_id == record_id, RecordLayout.section == data.section)
        .first()
    )
    if not row:
        row = RecordLayout(record_id=record_id, section=data.section, payload=data.payload)
        db.add(row)
    else:
        row.payload = data.payload
    db.commit()
    db.refresh(row)
    touch_record(db, record)
    return row


@router.delete("/{record_id}")
def delete(record_id: str, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    a = (
        db.query(Record)
        .filter(Record.id == record_id, Record.user_id == user.id, Record.deleted_at.is_(None))
        .first()
    )
    if not a:
        raise HTTPException(404, {"code": "RECORD_NOT_FOUND", "message": "Not found"})
    # Logical delete (Fase 2): travels as a tombstone in pull, never lost in sync.
    a.deleted_at = datetime.now(UTC)
    touch_record(db, a)
    return {"ok": True}


@router.post("/{record_id}/duplicate", response_model=RecordOut)
def duplicate(
    record_id: str, db: Session = Depends(get_db), user: User = Depends(get_current_user)
):
    orig = (
        db.query(Record)
        .filter(Record.id == record_id, Record.user_id == user.id, Record.deleted_at.is_(None))
        .first()
    )
    if not orig:
        raise HTTPException(404, {"code": "RECORD_NOT_FOUND", "message": "Not found"})
    return records_service.duplicate_record(db, orig, user.id)


# ---------- Filas ----------
@router.get("/{record_id}/rows", response_model=list[RecordRowOut])
def list_rows(
    record_id: str, db: Session = Depends(get_db), user: User = Depends(get_current_user)
):
    record = (
        db.query(Record)
        .filter(Record.id == record_id, Record.user_id == user.id, Record.deleted_at.is_(None))
        .first()
    )
    if not record:
        raise HTTPException(404, {"code": "RECORD_NOT_FOUND", "message": "Not found"})
    return records_service.ensure_live(db, record)


@router.post("/{record_id}/rows", response_model=RecordRowOut)
def create_row(
    record_id: str,
    data: RecordRowCreate,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    record = (
        db.query(Record)
        .filter(Record.id == record_id, Record.user_id == user.id, Record.deleted_at.is_(None))
        .first()
    )
    if not record:
        raise HTTPException(404, {"code": "RECORD_NOT_FOUND", "message": "Not found"})
    name = None
    company_id = data.company_id
    if company_id:
        company = (
            db.query(Company).filter(Company.id == company_id, Company.user_id == user.id).first()
        )
        if not company:
            raise HTTPException(404, {"code": "COMPANY_NOT_FOUND", "message": "Company not found"})
        name = company.name
    elif data.name and data.name.strip():
        name = data.name.strip()
    else:
        # empty rows allowed (same as _ensure_rows defaults): they render the
        # "pick company" hint and are blocked by validation on save/export
        name = ""
        company_id = None
    max_position = (
        db.query(func.max(RecordRow.position)).filter(RecordRow.record_id == record_id).scalar()
    )
    position = (max_position + 1) if max_position is not None else 0
    row = RecordRow(
        record_id=record_id, company_id=company_id, name_snapshot=name, position=position
    )
    db.add(row)
    db.commit()
    db.refresh(row)
    # every row gets its own month cells, with or without empresa
    for y in range(record.period_start, record.period_end + 1):
        for m in range(1, 13):
            db.add(Cell(record_id=record_id, row_id=row.id, company_id=company_id, year=y, month=m))
    db.commit()
    touch_record(db, record)
    return row


@router.put("/{record_id}/rows/{row_id}", response_model=RecordRowOut)
def update_row(
    record_id: str,
    row_id: str,
    data: RecordRowUpdate,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    record = (
        db.query(Record)
        .filter(Record.id == record_id, Record.user_id == user.id, Record.deleted_at.is_(None))
        .first()
    )
    if not record:
        raise HTTPException(404, {"code": "RECORD_NOT_FOUND", "message": "Not found"})
    row = (
        db.query(RecordRow).filter(RecordRow.id == row_id, RecordRow.record_id == record_id).first()
    )
    if not row:
        raise HTTPException(404, {"code": "ROW_NOT_FOUND", "message": "Row not found"})
    # empresa is an optional directory link: it only sets the label, never touches month cells
    if data.company_id is not None:
        if data.company_id == "":
            row.company_id = None
            if data.name:
                row.name_snapshot = data.name.strip()
        else:
            company = (
                db.query(Company)
                .filter(Company.id == data.company_id, Company.user_id == user.id)
                .first()
            )
            if not company:
                raise HTTPException(
                    404, {"code": "COMPANY_NOT_FOUND", "message": "Company not found"}
                )
            row.company_id = company.id
            row.name_snapshot = company.name
    elif data.name is not None:
        # display label only — companies must be pre-registered, never auto-created
        name = data.name.strip()
        if not name:
            raise HTTPException(400, {"code": "EMPTY_NAME", "message": "Empty name"})
        row.name_snapshot = name
    if data.position is not None:
        row.position = data.position
    if data.assignee is not None:
        row.assignee = data.assignee.strip() or None
    if data.note is not None:
        row.note = data.note.strip() or None
    db.commit()
    db.refresh(row)
    touch_record(db, record)
    return row


@router.delete("/{record_id}/rows/{row_id}")
def delete_row(
    record_id: str,
    row_id: str,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    record = (
        db.query(Record)
        .filter(Record.id == record_id, Record.user_id == user.id, Record.deleted_at.is_(None))
        .first()
    )
    if not record:
        raise HTTPException(404, {"code": "RECORD_NOT_FOUND", "message": "Not found"})
    row = (
        db.query(RecordRow).filter(RecordRow.id == row_id, RecordRow.record_id == record_id).first()
    )
    if not row:
        raise HTTPException(404, {"code": "ROW_NOT_FOUND", "message": "Row not found"})
    # month cells belong to the row: deleting it always removes its own cells
    db.query(Cell).filter(Cell.record_id == record_id, Cell.row_id == row_id).delete(
        synchronize_session=False
    )
    db.delete(row)
    db.commit()
    # reindex position
    rows = (
        db.query(RecordRow)
        .filter(RecordRow.record_id == record_id)
        .order_by(RecordRow.position)
        .all()
    )
    for idx, f in enumerate(rows):
        f.position = idx
    db.commit()
    # podar el alto guardado de la row eliminada
    dis = (
        db.query(RecordLayout)
        .filter(RecordLayout.record_id == record_id, RecordLayout.section == "table")
        .first()
    )
    if dis and isinstance(dis.payload, dict) and row_id in (dis.payload.get("rows") or {}):
        payload = dict(dis.payload)
        rows = dict(payload.get("rows") or {})
        rows.pop(row_id, None)
        payload["rows"] = rows
        dis.payload = payload
        db.commit()
    touch_record(db, record)
    return {"ok": True}


@router.post("/{record_id}/rows/reorder")
def reorder_rows(
    record_id: str,
    payload: dict,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    record = (
        db.query(Record)
        .filter(Record.id == record_id, Record.user_id == user.id, Record.deleted_at.is_(None))
        .first()
    )
    if not record:
        raise HTTPException(404, {"code": "RECORD_NOT_FOUND", "message": "Not found"})
    order: list[str] = payload.get("ids", payload.get("order", []))
    for idx, row_id in enumerate(order):
        db.query(RecordRow).filter(RecordRow.id == row_id, RecordRow.record_id == record_id).update(
            {"position": idx}
        )
    db.commit()
    touch_record(db, record)
    return {"ok": True}


# ---------- Celdas ----------
@router.get("/{record_id}/cells", response_model=list[CellOut])
def list_cells(
    record_id: str, db: Session = Depends(get_db), user: User = Depends(get_current_user)
):
    record = records_service.require_record(record_id, db, user)
    records_service.ensure_live(db, record)
    return db.query(Cell).filter(Cell.record_id == record_id).all()


@router.put("/cells/{cell_id}", response_model=CellOut)
def update_cell(
    cell_id: str,
    data: CellUpdate,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    c = db.get(Cell, cell_id)
    if not c:
        raise HTTPException(404, {"code": "CELL_NOT_FOUND", "message": "Not found"})
    record = db.get(Record, c.record_id)
    if not record or record.user_id != user.id:
        raise HTTPException(403, {"code": "UNAUTHORIZED", "message": "Unauthorized"})
    if record.deleted_at is not None:
        raise HTTPException(404, {"code": "RECORD_NOT_FOUND", "message": "Not found"})
    if data.reviewed is not None:
        c.reviewed = data.reviewed
    if data.assignee is not None:
        c.assignee = data.assignee
    if data.note is not None:
        c.note = data.note
    if data.color is not None:
        c.color = data.color or None
    if data.style is not None:
        c.style = data.style
    db.commit()
    db.refresh(c)
    records_service.recalc_progress(db, record.id)
    touch_record(db, record)
    return c


# alias legacy: el frontend antiguo normalizaba /records/../cells/{id}
@router.put("/../cells/{cell_id}", response_model=CellOut, include_in_schema=False)
def update_cell_alias(
    cell_id: str,
    data: CellUpdate,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    return update_cell(cell_id, data, db, user)


@router.post("/{record_id}/cells/bulk", response_model=list[CellOut])
def bulk_update(
    record_id: str,
    data: CellBulkUpdate,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    record = (
        db.query(Record)
        .filter(Record.id == record_id, Record.user_id == user.id, Record.deleted_at.is_(None))
        .first()
    )
    if not record:
        raise HTTPException(404, {"code": "RECORD_NOT_FOUND", "message": "Not found"})
    out = []
    for cell_id in data.ids:
        c = db.get(Cell, cell_id)
        if not c or c.record_id != record_id:
            continue
        if data.color is not None:
            c.color = data.color
        if data.style is not None:
            # merge style
            cur = c.style or {}
            cur.update(data.style)
            c.style = cur
        if data.reviewed is not None:
            c.reviewed = data.reviewed
        out.append(c)
    db.commit()
    for c in out:
        db.refresh(c)
    records_service.recalc_progress(db, record_id)
    touch_record(db, record)
    return out


@router.get("/{record_id}/stats")
def stats(record_id: str, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    record = records_service.require_record(record_id, db, user)
    total = db.query(func.count(Cell.id)).filter(Cell.record_id == record_id).scalar() or 0
    rev = (
        db.query(func.count(Cell.id))
        .filter(Cell.record_id == record_id, Cell.reviewed.is_(True))
        .scalar()
        or 0
    )
    records_service.ensure_live(db, record)
    # count fully-reviewed rows (every row counts, with or without company)
    total_rows, reviewed_count, pending_count = records_service.row_stats(db, record_id)
    prog = records_service.calc_progress(rev, total)
    return {
        "total": total_rows,
        "reviewed": reviewed_count,
        "pending": pending_count,
        "progress": prog,
        "total_cells": total,
        "reviewed_cells": rev,
    }


@router.get("/{record_id}/export")
def export_file(
    record_id: str,
    format: str = "pdf",
    lang: str = "es",
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    txt = strings(lang)
    if format not in ("pdf", "excel"):
        raise HTTPException(400, {"code": "FORMAT_INVALID", "message": "format must be pdf|excel"})
    record = records_service.require_record(record_id, db, user)
    if record.period_end - record.period_start + 1 > MAX_EXPORT_YEARS:
        raise HTTPException(400, {"code": "SCALE_TOO_LARGE", "message": "Scale too large"})
    rows = records_service.ensure_live(db, record)
    rows = sorted(rows, key=lambda f: f.position)
    missing = records_service.missing_fields(rows)
    if missing:
        raise HTTPException(
            status_code=422,
            detail={
                "code": "EXPORT_MISSING_FIELDS",
                "message": "Missing required fields to export",
                "missing": missing,
            },
        )
    cells = db.query(Cell).filter(Cell.record_id == record_id).all()

    if format == "excel":
        return build_excel(record, rows, cells, txt)
    return build_pdf(db, record, rows, cells, txt)
