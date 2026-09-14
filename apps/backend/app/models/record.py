import uuid
from datetime import UTC, datetime

from sqlalchemy import JSON, DateTime, ForeignKey, Integer, String, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column

from app.db.session import Base


class Record(Base):
    __tablename__ = "records"
    __table_args__ = (UniqueConstraint("user_id", "client_uuid", name="uq_record_user_client"),)
    id: Mapped[str] = mapped_column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    # Stable identity across clients (document_id).
    # Unique per user: two users may sync the same generated uuid.
    client_uuid: Mapped[str] = mapped_column(String, index=True, default=lambda: str(uuid.uuid4()))
    user_id: Mapped[str] = mapped_column(
        String, ForeignKey("users.id", ondelete="CASCADE"), index=True
    )
    title: Mapped[str] = mapped_column(String)
    review_type: Mapped[str] = mapped_column(String, default="")
    period_start: Mapped[int] = mapped_column(Integer, default=lambda: datetime.now(UTC).year)
    period_end: Mapped[int] = mapped_column(Integer, default=lambda: datetime.now(UTC).year)
    progress: Mapped[int] = mapped_column(Integer, default=0)
    staff_count: Mapped[int] = mapped_column(Integer, default=2)
    # Per-file team names: travel with the doc, LWW like staff_count.
    staff_names: Mapped[list] = mapped_column(JSON, default=list)
    # Sync: global revision, last writer, logical delete.
    revision: Mapped[int] = mapped_column(Integer, default=0, index=True)
    device_id: Mapped[str | None] = mapped_column(String, nullable=True)
    sync_status: Mapped[str] = mapped_column(String, default="clean")
    last_synced_revision: Mapped[int] = mapped_column(Integer, default=0)
    deleted_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=lambda: datetime.now(UTC))
    # No onupdate: the only writer is touch_record (sync/engine.py).
    # SQLAlchemy onupdate would clobber the LWW winner's updated_at.
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=lambda: datetime.now(UTC))
