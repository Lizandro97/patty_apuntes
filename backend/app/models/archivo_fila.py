import uuid
from datetime import UTC, datetime

from sqlalchemy import DateTime, ForeignKey, Integer, String
from sqlalchemy.orm import Mapped, mapped_column

from app.db.session import Base


class ArchivoFila(Base):
    __tablename__ = "archivo_filas"
    id: Mapped[str] = mapped_column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    archivo_id: Mapped[str] = mapped_column(
        String, ForeignKey("archivos.id", ondelete="CASCADE"), index=True
    )
    empresa_id: Mapped[str | None] = mapped_column(
        String, ForeignKey("empresas.id", ondelete="SET NULL"), nullable=True
    )
    nombre_snapshot: Mapped[str] = mapped_column(String)
    orden: Mapped[int] = mapped_column(Integer)
    responsable: Mapped[str | None] = mapped_column(String, nullable=True)
    observacion: Mapped[str | None] = mapped_column(String, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=lambda: datetime.now(UTC))
