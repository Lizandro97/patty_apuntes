from datetime import UTC, datetime, timedelta

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.models.device import Device
from app.models.pairing import PairingToken
from app.models.record import Record
from app.models.user import User
from app.routers.deps import get_current_user
from app.schemas.sync import (
    ClaimIn,
    ClaimOut,
    DeviceOut,
    PairingOut,
    PullOut,
    PushIn,
    PushOut,
    ResolveIn,
    ResolveOut,
    StatusOut,
)
from app.sync.engine import (
    SyncInvalid,
    apply_doc,
    current_revision,
    merge_docs,
    parse_dt,
    record_to_doc,
    touch_record,
)

router = APIRouter(prefix="/sync", tags=["sync"])


@router.get("/pull", response_model=PullOut)
def pull(
    since_revision: int = Query(default=0, ge=0),
    limit: int = Query(default=200, ge=1, le=500),
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    current = current_revision(db)
    rows = (
        db.query(Record)
        .filter(Record.user_id == user.id, Record.revision > since_revision)
        .order_by(Record.revision.asc())
        .limit(limit + 1)
        .all()
    )
    has_more = len(rows) > limit
    return PullOut(
        changes=[record_to_doc(db, r) for r in rows[:limit]],
        current_revision=current,
        has_more=has_more,
    )


@router.post("/push", response_model=PushOut)
def push(
    data: PushIn,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    accepted = []
    conflicts = []
    for doc in data.changes:
        try:
            verdict, payload = apply_doc(db, user.id, doc)
        except SyncInvalid as e:
            raise HTTPException(400, {"code": "SYNC_INVALID", "message": str(e)}) from e
        if verdict == "accepted":
            assert not isinstance(payload, dict)
            accepted.append({"client_uuid": payload.client_uuid, "revision": payload.revision})
        else:
            conflicts.append(
                {
                    "client_uuid": doc.get("client_uuid"),
                    "reason": "STALE_WRITE",
                    "server_doc": payload,
                }
            )
    return PushOut(accepted=accepted, conflicts=conflicts)


@router.get("/status", response_model=StatusOut)
def status(db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    _ = user
    return StatusOut(current_revision=current_revision(db))


@router.post("/devices/pairing", response_model=PairingOut)
def create_pairing(db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    pt = PairingToken(
        user_id=user.id,
        expires_at=datetime.now(UTC) + timedelta(seconds=600),
    )
    db.add(pt)
    db.commit()
    db.refresh(pt)
    return PairingOut(pairing_token=pt.token)


@router.post("/devices/claim", response_model=ClaimOut)
def claim_device(data: ClaimIn, db: Session = Depends(get_db)):
    pt = db.get(PairingToken, data.pairing_token)
    now = datetime.now(UTC)
    exp = (
        pt.expires_at
        if pt and pt.expires_at.tzinfo
        else (pt.expires_at.replace(tzinfo=UTC) if pt else now)
    )
    if not pt or pt.used or exp < now:
        raise HTTPException(400, {"code": "PAIRING_INVALID", "message": "Invalid pairing token"})
    pt.used = True
    dev = Device(name=data.name[:80])
    db.add(dev)
    db.commit()
    db.refresh(dev)
    return ClaimOut(device_id=dev.id)


@router.get("/devices", response_model=list[DeviceOut])
def list_devices(db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    _ = user
    return db.query(Device).order_by(Device.paired_at.desc()).all()


@router.post("/devices/{device_id}/revoke")
def revoke_device(
    device_id: str, db: Session = Depends(get_db), user: User = Depends(get_current_user)
):
    _ = user
    dev = db.get(Device, device_id)
    if not dev:
        raise HTTPException(404, {"code": "DEVICE_NOT_FOUND", "message": "Not found"})
    dev.revoked = True
    db.commit()
    return {"ok": True}


@router.post("/resolve", response_model=ResolveOut)
def resolve(data: ResolveIn, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    """Resolucion explicita de un conflicto (Fase 5).

    merge: union filas + OR celdas + metadata del mas nuevo.
    mine: el doc del cliente gana (se reestampa a ahora).
    theirs: se conserva el servidor, sin cambios.
    """
    from app.sync.engine import _replace_parts

    if data.strategy not in ("merge", "mine", "theirs"):
        raise HTTPException(400, {"code": "STRATEGY_INVALID", "message": "Bad strategy"})
    stored = (
        db.query(Record)
        .filter(Record.client_uuid == data.client_uuid, Record.user_id == user.id)
        .first()
    )
    if not stored:
        raise HTTPException(404, {"code": "RECORD_NOT_FOUND", "message": "Not found"})
    if data.strategy == "theirs":
        return ResolveOut(doc=record_to_doc(db, stored))
    if not isinstance(data.doc, dict):
        raise HTTPException(400, {"code": "RESOLVE_NEEDS_DOC", "message": "doc requerido"})
    if data.strategy == "mine":
        forced = dict(data.doc)
        forced["updated_at"] = datetime.now(UTC).isoformat()
        _replace_parts(db, stored, forced)
        stored.deleted_at = None
        touch_record(db, stored, forced.get("device_id"), parse_dt(forced["updated_at"]))
        return ResolveOut(doc=record_to_doc(db, stored))
    merged = merge_docs(record_to_doc(db, stored), data.doc)
    _replace_parts(db, stored, merged)
    stored.deleted_at = None
    touch_record(db, stored, merged.get("device_id"), parse_dt(merged["updated_at"]))
    return ResolveOut(doc=record_to_doc(db, stored))
