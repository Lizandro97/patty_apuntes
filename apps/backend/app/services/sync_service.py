"""Servicio de resolucion de conflictos sync (Fase A).

Movido desde routers/sync.py: el router valida el strategy, el servicio
ejecuta merge/mine/theirs contra el motor LWW.
"""

from datetime import UTC, datetime

from fastapi import HTTPException
from sqlalchemy.orm import Session

from app.models.record import Record
from app.sync.engine import (
    _replace_parts,
    merge_docs,
    parse_dt,
    record_to_doc,
    touch_record,
)


def resolve_conflict(
    db: Session, user_id: str, client_uuid: str, strategy: str, doc: dict | None
) -> dict:
    """Resolucion explicita de un conflicto.

    merge: union filas + OR celdas + metadata del mas nuevo.
    mine: el doc del cliente gana (se reestampa a ahora).
    theirs: se conserva el servidor, sin cambios.
    """
    stored = (
        db.query(Record)
        .filter(Record.client_uuid == client_uuid, Record.user_id == user_id)
        .first()
    )
    if not stored:
        raise HTTPException(404, {"code": "RECORD_NOT_FOUND", "message": "Not found"})
    if strategy == "theirs":
        return record_to_doc(db, stored)
    if not isinstance(doc, dict):
        raise HTTPException(400, {"code": "RESOLVE_NEEDS_DOC", "message": "doc requerido"})
    if strategy == "mine":
        forced = dict(doc)
        forced["updated_at"] = datetime.now(UTC).isoformat()
        _replace_parts(db, stored, forced)
        stored.deleted_at = None
        touch_record(db, stored, forced.get("device_id"), parse_dt(forced["updated_at"]))
        return record_to_doc(db, stored)
    merged = merge_docs(record_to_doc(db, stored), doc)
    _replace_parts(db, stored, merged)
    stored.deleted_at = None
    touch_record(db, stored, merged.get("device_id"), parse_dt(merged["updated_at"]))
    return record_to_doc(db, stored)
