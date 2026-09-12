from datetime import date, datetime

from pydantic import BaseModel, Field


class ArchivoCreate(BaseModel):
    titulo: str
    tipo_revision: str = ""
    periodo_inicio: int = Field(default_factory=lambda: date.today().year)
    periodo_fin: int = Field(default_factory=lambda: date.today().year)
    personal_count: int | None = 2


class ArchivoUpdate(BaseModel):
    titulo: str | None = None
    tipo_revision: str | None = None
    periodo_inicio: int | None = None
    periodo_fin: int | None = None
    personal_count: int | None = None


class ArchivoOut(BaseModel):
    id: str
    titulo: str
    tipo_revision: str
    periodo_inicio: int
    periodo_fin: int
    progreso: int
    personal_count: int
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class ArchivoFilaOut(BaseModel):
    id: str
    archivo_id: str
    empresa_id: str | None
    nombre_snapshot: str
    orden: int
    responsable: str | None = None
    observacion: str | None = None

    class Config:
        from_attributes = True


class ArchivoFilaCreate(BaseModel):
    empresa_id: str | None = None
    nombre: str | None = None


class ArchivoFilaUpdate(BaseModel):
    empresa_id: str | None = None
    nombre: str | None = None
    orden: int | None = None
    responsable: str | None = None
    observacion: str | None = None


class CeldaOut(BaseModel):
    id: str
    archivo_id: str
    fila_id: str
    empresa_id: str | None = None
    anio: int
    mes: int
    revisado: bool
    responsable: str | None = None
    fecha_revision: str | None = None
    observacion: str | None = None
    color: str | None = None
    style: dict | None = None

    class Config:
        from_attributes = True


class CeldaUpdate(BaseModel):
    revisado: bool | None = None
    responsable: str | None = None
    observacion: str | None = None
    color: str | None = None
    style: dict | None = None


class CeldaBulkUpdate(BaseModel):
    ids: list[str]
    color: str | None = None
    style: dict | None = None
    revisado: bool | None = None


class DisenoOut(BaseModel):
    seccion: str
    payload: dict
    updated_at: datetime

    class Config:
        from_attributes = True


class DisenoUpdate(BaseModel):
    seccion: str
    payload: dict


class ConfigUpdate(BaseModel):
    primary_color: str | None = None
    font_family: str | None = None
    font_size_px: int | None = None
    table_density: str | None = None
    grid_columns: int | None = None
    show_summary: bool | None = None
    rounded_borders: bool | None = None
    pastel_mode: bool | None = None
    visible_fields: dict | None = None
    table_header_bg: str | None = None


class ConfigOut(BaseModel):
    primary_color: str
    font_family: str
    font_size_px: int
    table_density: str
    grid_columns: int
    show_summary: bool
    rounded_borders: bool
    pastel_mode: bool
    visible_fields: dict
    table_header_bg: str

    class Config:
        from_attributes = True
