import uuid
from datetime import UTC, datetime

from sqlalchemy import JSON, DateTime, ForeignKey, String, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column

from app.db.session import Base


class RecordLayout(Base):
    """Visual design per record: 'sheet' section (A4: orientation, zoom,
    dimensions) or 'table' section (column widths, row heights)."""

    __tablename__ = "record_layouts"
    __table_args__ = (UniqueConstraint("record_id", "section", name="uq_layout_section"),)
    id: Mapped[str] = mapped_column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    record_id: Mapped[str] = mapped_column(
        String, ForeignKey("records.id", ondelete="CASCADE"), index=True
    )
    section: Mapped[str] = mapped_column(String)  # sheet | table
    payload: Mapped[dict] = mapped_column(JSON, default=dict)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime, default=lambda: datetime.now(UTC), onupdate=lambda: datetime.now(UTC)
    )
