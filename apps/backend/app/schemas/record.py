from datetime import date, datetime

from pydantic import BaseModel, Field


class RecordCreate(BaseModel):
    title: str
    review_type: str = ""
    period_start: int = Field(default_factory=lambda: date.today().year)
    period_end: int = Field(default_factory=lambda: date.today().year)
    staff_count: int | None = 2
    staff_names: list[str] | None = None


class RecordUpdate(BaseModel):
    title: str | None = None
    review_type: str | None = None
    period_start: int | None = None
    period_end: int | None = None
    staff_count: int | None = None
    staff_names: list[str] | None = None


class RecordOut(BaseModel):
    id: str
    title: str
    review_type: str
    period_start: int
    period_end: int
    progress: int
    staff_count: int
    staff_names: list[str] = []
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class RecordRowOut(BaseModel):
    id: str
    record_id: str
    company_id: str | None
    name_snapshot: str
    position: int
    assignee: str | None = None
    note: str | None = None

    class Config:
        from_attributes = True


class RecordRowCreate(BaseModel):
    company_id: str | None = None
    name: str | None = None


class RecordRowUpdate(BaseModel):
    company_id: str | None = None
    name: str | None = None
    position: int | None = None
    assignee: str | None = None
    note: str | None = None


class CellOut(BaseModel):
    id: str
    record_id: str
    row_id: str
    company_id: str | None = None
    year: int
    month: int
    reviewed: bool
    assignee: str | None = None
    reviewed_at: str | None = None
    note: str | None = None
    color: str | None = None
    style: dict | None = None

    class Config:
        from_attributes = True


class CellUpdate(BaseModel):
    reviewed: bool | None = None
    assignee: str | None = None
    note: str | None = None
    color: str | None = None
    style: dict | None = None


class CellBulkUpdate(BaseModel):
    ids: list[str]
    color: str | None = None
    style: dict | None = None
    reviewed: bool | None = None


class LayoutOut(BaseModel):
    section: str
    payload: dict
    updated_at: datetime

    class Config:
        from_attributes = True


class LayoutUpdate(BaseModel):
    section: str
    payload: dict


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

    class Config:
        from_attributes = True
