import uuid
from datetime import UTC, datetime

from sqlalchemy import (
    JSON,
    Boolean,
    Date,
    DateTime,
    ForeignKey,
    Integer,
    String,
    UniqueConstraint,
)
from sqlalchemy.orm import Mapped, mapped_column

from app.db.session import Base


class Cell(Base):
    __tablename__ = "cells"
    __table_args__ = (UniqueConstraint("record_id", "row_id", "year", "month", name="uq_cell_row"),)
    id: Mapped[str] = mapped_column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    record_id: Mapped[str] = mapped_column(
        String, ForeignKey("records.id", ondelete="CASCADE"), index=True
    )
    row_id: Mapped[str] = mapped_column(
        String, ForeignKey("record_rows.id", ondelete="CASCADE"), index=True
    )
    company_id: Mapped[str | None] = mapped_column(
        String, ForeignKey("companies.id", ondelete="SET NULL"), nullable=True, index=True
    )
    year: Mapped[int] = mapped_column(Integer)
    month: Mapped[int] = mapped_column(Integer)  # 1-12
    reviewed: Mapped[bool] = mapped_column(Boolean, default=False)
    assignee: Mapped[str | None] = mapped_column(String, nullable=True)
    reviewed_at: Mapped[str | None] = mapped_column(Date, nullable=True)  # store as date
    note: Mapped[str | None] = mapped_column(String, nullable=True)
    color: Mapped[str | None] = mapped_column(
        String, nullable=True
    )  # hex por check, fallback a config
    style: Mapped[dict | None] = mapped_column(
        JSON, nullable=True
    )  # {bold, italic, underline, align, fontFamily}
    updated_at: Mapped[datetime] = mapped_column(
        DateTime, default=lambda: datetime.now(UTC), onupdate=lambda: datetime.now(UTC)
    )
