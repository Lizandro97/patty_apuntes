"""Sync conflict resolution service (Fase A).

Moved from routers/sync.py: the router validates the strategy, the service
executes merge/mine/theirs against the LWW engine.
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
    """Explicit conflict resolution.

    merge: row union + cell OR + newest metadata.
    mine: the client doc wins (re-stamped to now).
    theirs: the server is kept, no changes.
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
        raise HTTPException(400, {"code": "RESOLVE_NEEDS_DOC", "message": "doc is required"})
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
