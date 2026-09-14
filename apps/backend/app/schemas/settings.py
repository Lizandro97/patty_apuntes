"""User preference DTOs.

Re-exported from app.schemas.record for compatibility.
"""

from pydantic import BaseModel, ConfigDict


class SettingsUpdate(BaseModel):
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
    language: str | None = None


class SettingsOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

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
    language: str
