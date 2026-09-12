import uuid
from datetime import UTC, datetime

from sqlalchemy import JSON, Boolean, DateTime, ForeignKey, Integer, String
from sqlalchemy.orm import Mapped, mapped_column

from app.db.session import Base


class Settings(Base):
    __tablename__ = "settings"
    id: Mapped[str] = mapped_column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id: Mapped[str] = mapped_column(
        String, ForeignKey("users.id", ondelete="CASCADE"), unique=True, index=True
    )
    primary_color: Mapped[str] = mapped_column(String, default="#6366f1")
    font_family: Mapped[str] = mapped_column(String, default="Inter")
    font_size_px: Mapped[int] = mapped_column(Integer, default=14)
    table_density: Mapped[str] = mapped_column(String, default="normal")
    grid_columns: Mapped[int] = mapped_column(Integer, default=3)
    show_summary: Mapped[bool] = mapped_column(Boolean, default=True)
    rounded_borders: Mapped[bool] = mapped_column(Boolean, default=True)
    pastel_mode: Mapped[bool] = mapped_column(Boolean, default=True)
    visible_fields: Mapped[dict] = mapped_column(
        JSON,
        default=lambda: {
            "names": True,
            "assignee": True,
            "date": True,
            "notes": True,
        },
    )
    table_header_bg: Mapped[str] = mapped_column(String, default="#e0e7ff")
    language: Mapped[str] = mapped_column(String, default="es")
    updated_at: Mapped[datetime] = mapped_column(
        DateTime, default=lambda: datetime.now(UTC), onupdate=lambda: datetime.now(UTC)
    )
