import uuid

from sqlalchemy import JSON, Boolean, Date, ForeignKey, Integer, String, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column

from app.db.session import Base


class Celda(Base):
    __tablename__ = "celdas"
    __table_args__ = (UniqueConstraint("archivo_id", "fila_id", "anio", "mes", name="uq_celda_fila"),)
    id: Mapped[str] = mapped_column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    archivo_id: Mapped[str] = mapped_column(
        String, ForeignKey("archivos.id", ondelete="CASCADE"), index=True
    )
    fila_id: Mapped[str] = mapped_column(
        String, ForeignKey("archivo_filas.id", ondelete="CASCADE"), index=True
    )
    empresa_id: Mapped[str | None] = mapped_column(
        String, ForeignKey("empresas.id", ondelete="SET NULL"), nullable=True, index=True
    )
    anio: Mapped[int] = mapped_column(Integer)
    mes: Mapped[int] = mapped_column(Integer)  # 1-12
    revisado: Mapped[bool] = mapped_column(Boolean, default=False)
    responsable: Mapped[str | None] = mapped_column(String, nullable=True)
    fecha_revision: Mapped[str | None] = mapped_column(Date, nullable=True)  # store as date
    observacion: Mapped[str | None] = mapped_column(String, nullable=True)
    color: Mapped[str | None] = mapped_column(
        String, nullable=True
    )  # hex por check, fallback a config
    style: Mapped[dict | None] = mapped_column(
        JSON, nullable=True
    )  # {bold, italic, underline, align, fontFamily}
