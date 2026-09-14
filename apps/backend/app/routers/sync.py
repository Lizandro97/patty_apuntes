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
from app.services.sync_service import resolve_conflict
from app.sync.engine import (
    SyncInvalid,
    apply_doc,
    current_revision,
    record_to_doc,
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
    """Public pairing by design (the new device has no JWT yet).

    The single-use pairing_token authenticates the operation and the device
    is bound to the token owner's user_id (multitenant).
    """
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
    dev = Device(name=data.name[:80], user_id=pt.user_id)
    db.add(dev)
    db.commit()
    db.refresh(dev)
    return ClaimOut(device_id=dev.id)


@router.get("/devices", response_model=list[DeviceOut])
def list_devices(db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    return (
        db.query(Device).filter(Device.user_id == user.id).order_by(Device.paired_at.desc()).all()
    )


@router.post("/devices/{device_id}/revoke")
def revoke_device(
    device_id: str, db: Session = Depends(get_db), user: User = Depends(get_current_user)
):
    dev = db.query(Device).filter(Device.id == device_id, Device.user_id == user.id).first()
    if not dev:
        raise HTTPException(404, {"code": "DEVICE_NOT_FOUND", "message": "Not found"})
    dev.revoked = True
    db.commit()
    return {"ok": True}


@router.post("/resolve", response_model=ResolveOut)
def resolve(data: ResolveIn, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    """Resolucion explicita de un conflicto (merge | mine | theirs)."""
    doc = resolve_conflict(db, user.id, data.client_uuid, data.strategy, data.doc)
    return ResolveOut(doc=doc)
