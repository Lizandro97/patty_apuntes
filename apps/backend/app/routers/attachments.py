import hashlib
from pathlib import Path

from fastapi import APIRouter, Depends, HTTPException, UploadFile
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session

from app.core.config import settings
from app.db.session import get_db
from app.models.attachment import Attachment
from app.models.record import Record
from app.models.user import User
from app.routers.deps import get_current_user

router = APIRouter(tags=["attachments"])

ALLOWED_MIME = {"image/jpeg", "image/png", "image/webp", "application/pdf"}
EXT = {"image/jpeg": ".jpg", "image/png": ".png", "image/webp": ".webp", "application/pdf": ".pdf"}


def _record_or_404(record_id: str, db: Session, user: User) -> Record:
    a = (
        db.query(Record)
        .filter(
            Record.id == record_id,
            Record.user_id == user.id,
            Record.deleted_at.is_(None),
        )
        .first()
    )
    if not a:
        raise HTTPException(404, {"code": "RECORD_NOT_FOUND", "message": "Not found"})
    return a


def _out(a: Attachment, dedup: bool = False) -> dict:
    return {
        "id": a.id,
        "hash": a.hash,
        "mime": a.mime,
        "size": a.size,
        "created_by_device": a.created_by_device,
        "dedup": dedup,
    }


@router.post("/records/{record_id}/attachments")
def upload(
    record_id: str,
    file: UploadFile,
    device_id: str | None = None,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    _record_or_404(record_id, db, user)
    mime = (file.content_type or "").split(";")[0].strip().lower()
    if mime not in ALLOWED_MIME:
        raise HTTPException(400, {"code": "MIME_INVALID", "message": "Tipo no permitido"})
    data = file.file.read()
    max_bytes = settings.MAX_UPLOAD_MB * 1024 * 1024
    if len(data) > max_bytes:
        raise HTTPException(400, {"code": "FILE_TOO_LARGE", "message": "Archivo muy grande"})
    digest = hashlib.sha256(data).hexdigest()
    existing = (
        db.query(Attachment)
        .filter(Attachment.record_id == record_id, Attachment.hash == digest)
        .first()
    )
    if existing:
        return _out(existing, dedup=True)
    directory = Path(settings.ATTACH_DIR) / record_id
    directory.mkdir(parents=True, exist_ok=True)
    path = directory / f"{digest}{EXT[mime]}"
    path.write_bytes(data)
    a = Attachment(
        record_id=record_id,
        hash=digest,
        mime=mime,
        size=len(data),
        created_by_device=device_id,
    )
    db.add(a)
    db.commit()
    db.refresh(a)
    return _out(a)


@router.get("/records/{record_id}/attachments")
def list_attachments(
    record_id: str, db: Session = Depends(get_db), user: User = Depends(get_current_user)
):
    _record_or_404(record_id, db, user)
    return [_out(a) for a in db.query(Attachment).filter(Attachment.record_id == record_id).all()]


@router.get("/attachments/{attachment_id}/content")
def content(
    attachment_id: str, db: Session = Depends(get_db), user: User = Depends(get_current_user)
):
    a = db.get(Attachment, attachment_id)
    if not a:
        raise HTTPException(404, {"code": "ATTACHMENT_NOT_FOUND", "message": "Not found"})
    _record_or_404(a.record_id, db, user)
    for ext in (".jpg", ".png", ".webp", ".pdf"):
        path = Path(settings.ATTACH_DIR) / a.record_id / f"{a.hash}{ext}"
        if path.exists():
            return FileResponse(path, media_type=a.mime)
    raise HTTPException(404, {"code": "ATTACHMENT_FILE_MISSING", "message": "Missing file"})
