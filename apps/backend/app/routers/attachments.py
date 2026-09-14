import hashlib
from pathlib import Path

from fastapi import APIRouter, Depends, HTTPException, Request, UploadFile
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
_CHUNK = 1024 * 1024


def _sniff_mime(head: bytes) -> str | None:
    """Detect the real type via magic bytes (never trust the client header)."""
    if head.startswith(b"\xff\xd8\xff"):
        return "image/jpeg"
    if head.startswith(b"\x89PNG\r\n\x1a\n"):
        return "image/png"
    if head.startswith(b"RIFF") and head[8:12] == b"WEBP":
        return "image/webp"
    if head.startswith(b"%PDF"):
        return "application/pdf"
    return None


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
    request: Request,
    device_id: str | None = None,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    _record_or_404(record_id, db, user)
    max_bytes = settings.MAX_UPLOAD_MB * 1024 * 1024
    declared = request.headers.get("content-length")
    if declared and declared.isdigit() and int(declared) > max_bytes + 1024 * 1024:
        raise HTTPException(400, {"code": "FILE_TOO_LARGE", "message": "File too large"})
    claimed = (file.content_type or "").split(";")[0].strip().lower()
    if claimed not in ALLOWED_MIME:
        raise HTTPException(400, {"code": "MIME_INVALID", "message": "Type not allowed"})
    # Chunked bounded read: never more than max_bytes lands in RAM.
    chunks: list[bytes] = []
    size = 0
    while True:
        part = file.file.read(_CHUNK)
        if not part:
            break
        size += len(part)
        if size > max_bytes:
            raise HTTPException(400, {"code": "FILE_TOO_LARGE", "message": "File too large"})
        chunks.append(part)
    data = b"".join(chunks)
    if not data:
        raise HTTPException(400, {"code": "FILE_EMPTY", "message": "Empty file"})
    mime = _sniff_mime(data[:16])
    if mime is None or mime != claimed:
        raise HTTPException(400, {"code": "MIME_MISMATCH", "message": "Content does not match"})
    digest = hashlib.sha256(data).hexdigest()
    existing = (
        db.query(Attachment)
        .filter(Attachment.record_id == record_id, Attachment.hash == digest)
        .first()
    )
    if existing:
        return _out(existing, dedup=True)
    directory = Path(settings.attach_path) / record_id
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
        path = Path(settings.attach_path) / a.record_id / f"{a.hash}{ext}"
        if path.exists():
            return FileResponse(path, media_type=a.mime)
    raise HTTPException(404, {"code": "ATTACHMENT_FILE_MISSING", "message": "Missing file"})
