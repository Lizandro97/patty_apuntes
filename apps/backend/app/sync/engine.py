"""Motor sync LWW v1 (Fase 2).

- `revision` global via sync_meta (un contador, +1 por commit aceptado).
- `touch_record`: marca updated_at/revision/device tras cada mutacion local.
- `apply_doc`: upsert idempotente por client_uuid; LWW por updated_at
  (empate: device_id lexicografico mayor). Reintento identico -> accepted
  sin cambios. Reemplazo wholesale documento (merge por celda en Fase 5).
"""

import uuid
from datetime import UTC, datetime

from sqlalchemy.orm import Session

from app.models.cell import Cell
from app.models.record import Record
from app.models.record_layout import RecordLayout
from app.models.record_row import RecordRow
from app.models.sync_meta import SyncMeta
from app.validation.rules import sanitize_staff_names


class SyncInvalid(Exception):
    pass


def parse_dt(v) -> datetime:
    if isinstance(v, datetime):
        dt = v
    elif isinstance(v, str) and v.strip():
        dt = datetime.fromisoformat(v.strip().replace("Z", "+00:00"))
    else:
        raise SyncInvalid("updated_at requerido")
    if dt.tzinfo is None:
        dt = dt.replace(tzinfo=UTC)
    return dt.astimezone(UTC)


def _iso(v) -> str | None:
    if v is None:
        return None
    if isinstance(v, datetime):
        dt = v if v.tzinfo else v.replace(tzinfo=UTC)
        return dt.astimezone(UTC).isoformat()
    return str(v)


def next_revision(db: Session) -> int:
    meta = db.get(SyncMeta, 1)
    if not meta:
        meta = SyncMeta(id=1, current_revision=0)
        db.add(meta)
        db.flush()
    meta.current_revision = (meta.current_revision or 0) + 1
    db.flush()
    return meta.current_revision


def current_revision(db: Session) -> int:
    meta = db.get(SyncMeta, 1)
    return meta.current_revision if meta else 0


def touch_record(
    db: Session,
    record: Record,
    device_id: str | None = None,
    updated_at: datetime | None = None,
) -> Record:
    # Preserva el timestamp del escritor (LWW); solo usa hora local en
    # mutaciones web directas. Sobrescribirlo romperia la idempotencia.
    record.updated_at = updated_at or datetime.now(UTC)
    record.revision = next_revision(db)
    if device_id is not None:
        record.device_id = device_id
    record.sync_status = "clean"
    record.last_synced_revision = record.revision
    db.commit()
    db.refresh(record)
    return record


def incoming_wins(
    stored_updated: datetime,
    stored_device: str | None,
    incoming_updated: datetime,
    incoming_device: str | None,
) -> bool:
    """LWW: gana el mas nuevo; en empate, device_id mayor."""
    s = stored_updated if stored_updated.tzinfo else stored_updated.replace(tzinfo=UTC)
    if incoming_updated > s:
        return True
    if incoming_updated < s:
        return False
    return (incoming_device or "") > (stored_device or "")


def record_to_doc(db: Session, record: Record) -> dict:
    rows = (
        db.query(RecordRow)
        .filter(RecordRow.record_id == record.id)
        .order_by(RecordRow.position)
        .all()
    )
    cells = db.query(Cell).filter(Cell.record_id == record.id).all()
    layouts = db.query(RecordLayout).filter(RecordLayout.record_id == record.id).all()
    by_section = {lay.section: lay.payload or {} for lay in layouts}
    return {
        "client_uuid": record.client_uuid,
        "type": "review",
        "title": record.title,
        "metadata": {"review_type": record.review_type or ""},
        "period_start": record.period_start,
        "period_end": record.period_end,
        "staff_count": record.staff_count,
        "staff_names": list(record.staff_names or []),
        "sections": [
            {
                "client_uuid": r.id,
                "company_id": r.company_id,
                "name_snapshot": r.name_snapshot,
                "position": r.position,
                "assignee": r.assignee,
                "note": r.note,
                "updated_at": _iso(r.updated_at or record.updated_at),
            }
            for r in rows
        ],
        "content": [
            {
                "client_uuid": c.id,
                "row_uuid": c.row_id,
                "year": c.year,
                "month": c.month,
                "reviewed": c.reviewed,
                "color": c.color,
                "assignee": c.assignee,
                "note": c.note,
                "style": c.style,
                "updated_at": _iso(c.updated_at or record.updated_at),
            }
            for c in cells
        ],
        "layout": {
            "sheet": by_section.get("sheet", {}),
            "table": by_section.get("table", {}),
        },
        "created_at": _iso(record.created_at),
        "updated_at": _iso(record.updated_at),
        "revision": record.revision,
        "deleted_at": _iso(record.deleted_at),
        "device_id": record.device_id,
        "sync_status": "clean",
        "last_synced_revision": record.revision,
    }


def _require_doc_shape(doc: dict) -> tuple[str, datetime, str | None]:
    if not isinstance(doc, dict):
        raise SyncInvalid("change debe ser objeto")
    cuid = doc.get("client_uuid")
    if not cuid or not isinstance(cuid, str):
        raise SyncInvalid("client_uuid requerido")
    return cuid, parse_dt(doc.get("updated_at")), doc.get("device_id")


def _replace_parts(db: Session, record: Record, doc: dict) -> None:
    sections = doc.get("sections") or []
    content = doc.get("content") or []
    layout = doc.get("layout") or {}
    if not isinstance(sections, list) or not isinstance(content, list):
        raise SyncInvalid("sections/content deben ser listas")

    record.title = doc.get("title") or record.title
    meta = doc.get("metadata") or {}
    if isinstance(meta, dict) and "review_type" in meta:
        record.review_type = meta["review_type"] or ""
    for k in ("period_start", "period_end", "staff_count"):
        if doc.get(k) is not None:
            setattr(record, k, doc[k])
    if isinstance(doc.get("staff_names"), list):
        record.staff_names = sanitize_staff_names(doc["staff_names"])

    db.query(Cell).filter(Cell.record_id == record.id).delete(synchronize_session=False)
    db.query(RecordRow).filter(RecordRow.record_id == record.id).delete(synchronize_session=False)
    db.query(RecordLayout).filter(RecordLayout.record_id == record.id).delete(
        synchronize_session=False
    )
    db.flush()

    row_ids = set()
    for s in sections:
        if not isinstance(s, dict) or not s.get("client_uuid"):
            raise SyncInvalid("section sin client_uuid")
        row_ids.add(s["client_uuid"])
        db.add(
            RecordRow(
                id=s["client_uuid"],
                record_id=record.id,
                company_id=s.get("company_id"),
                name_snapshot=s.get("name_snapshot") or "",
                position=s.get("position") or 0,
                assignee=s.get("assignee"),
                note=s.get("note"),
            )
        )
    for c in content:
        if not isinstance(c, dict) or c.get("row_uuid") not in row_ids:
            raise SyncInvalid("cell con row_uuid desconocido")
        db.add(
            Cell(
                id=c.get("client_uuid") or str(uuid.uuid4()),
                record_id=record.id,
                row_id=c["row_uuid"],
                company_id=None,
                year=c.get("year"),
                month=c.get("month"),
                reviewed=bool(c.get("reviewed")),
                assignee=c.get("assignee"),
                note=c.get("note"),
                color=c.get("color"),
                style=c.get("style"),
            )
        )
    for section in ("sheet", "table"):
        payload = (layout.get(section) if isinstance(layout, dict) else None) or {}
        if payload:
            db.add(RecordLayout(record_id=record.id, section=section, payload=payload))


def merge_docs(server_doc: dict, incoming_doc: dict) -> dict:
    """Fusion v2: union de filas + OR de celdas + metadata del mas nuevo.

    Espejo TS en packages/sync (mergeDocuments). Ningun marcado se pierde:
    si algun lado reviso la celda, queda revisada.
    """
    out: dict = dict(server_doc)
    s_sections = server_doc.get("sections") or []
    i_sections = incoming_doc.get("sections") or []
    by_uuid: dict = {}
    for s in s_sections:
        if isinstance(s, dict) and s.get("client_uuid"):
            by_uuid[s["client_uuid"]] = dict(s)
    for s in i_sections:
        if isinstance(s, dict) and s.get("client_uuid"):
            by_uuid[s["client_uuid"]] = dict(s)
    out["sections"] = [by_uuid[k] for k in sorted(by_uuid)]

    def key(c: dict) -> tuple:
        return (c.get("row_uuid"), c.get("year"), c.get("month"))

    merged_cells: dict = {}
    for c in (server_doc.get("content") or []) + (incoming_doc.get("content") or []):
        if not isinstance(c, dict):
            continue
        k = key(c)
        prev = merged_cells.get(k)
        if prev is None:
            merged_cells[k] = dict(c)
        elif c.get("reviewed") and not prev.get("reviewed"):
            merged_cells[k] = dict(c)
    out["content"] = list(merged_cells.values())

    try:
        s_dt = parse_dt(server_doc.get("updated_at"))
        i_dt = parse_dt(incoming_doc.get("updated_at"))
        newer = incoming_doc if i_dt >= s_dt else server_doc
    except SyncInvalid:
        newer = server_doc
    for k in (
        "title",
        "metadata",
        "period_start",
        "period_end",
        "staff_count",
        "staff_names",
        "layout",
    ):
        if k in newer:
            out[k] = newer[k]
    out["updated_at"] = datetime.now(UTC).isoformat()
    return out


def apply_doc(db: Session, user_id: str, doc: dict) -> tuple[str, dict | Record]:
    """Aplica un Document. Devuelve ("accepted", record) o ("conflict", server_doc)."""
    cuid, incoming_updated, incoming_device = _require_doc_shape(doc)
    stored = db.query(Record).filter(Record.client_uuid == cuid, Record.user_id == user_id).first()
    if not stored:
        record = Record(
            user_id=user_id,
            client_uuid=cuid,
            title=doc.get("title") or "Sin título",
            deleted_at=None,
        )
        db.add(record)
        db.flush()
        _replace_parts(db, record, doc)
        record.deleted_at = None
        touch_record(db, record, incoming_device, incoming_updated)
        return "accepted", record

    if stored.deleted_at is not None:
        return "conflict", record_to_doc(db, stored)
    stored_aware = stored.updated_at
    if stored_aware.tzinfo is None:
        stored_aware = stored_aware.replace(tzinfo=UTC)
    if stored_aware == incoming_updated and (stored.device_id or "") == (incoming_device or ""):
        return "accepted", stored  # reintento identico: idempotente
    if incoming_wins(stored.updated_at, stored.device_id, incoming_updated, incoming_device):
        _replace_parts(db, stored, doc)
        stored.deleted_at = None
        touch_record(db, stored, incoming_device, incoming_updated)
        return "accepted", stored
    return "conflict", record_to_doc(db, stored)
