import uuid
from datetime import UTC, datetime

from sqlalchemy import DateTime, ForeignKey, Integer, String
from sqlalchemy.orm import Mapped, mapped_column

from app.db.session import Base


class RecordRow(Base):
    __tablename__ = "record_rows"
    id: Mapped[str] = mapped_column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    record_id: Mapped[str] = mapped_column(
        String, ForeignKey("records.id", ondelete="CASCADE"), index=True
    )
    company_id: Mapped[str | None] = mapped_column(
        String, ForeignKey("companies.id", ondelete="SET NULL"), nullable=True
    )
    name_snapshot: Mapped[str] = mapped_column(String)
    position: Mapped[int] = mapped_column(Integer)
    assignee: Mapped[str | None] = mapped_column(String, nullable=True)
    note: Mapped[str | None] = mapped_column(String, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=lambda: datetime.now(UTC))
    updated_at: Mapped[datetime] = mapped_column(
        DateTime, default=lambda: datetime.now(UTC), onupdate=lambda: datetime.now(UTC)
    )
