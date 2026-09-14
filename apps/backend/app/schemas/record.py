from datetime import date, datetime

from pydantic import BaseModel, ConfigDict, Field, field_validator

from app.schemas.settings import SettingsOut, SettingsUpdate

__all__ = [
    "RecordCreate",
    "RecordUpdate",
    "RecordOut",
    "RecordRowOut",
    "RecordRowCreate",
    "RecordRowUpdate",
    "CellOut",
    "CellUpdate",
    "CellBulkUpdate",
    "LayoutOut",
    "LayoutUpdate",
    # Re-export for compat (canonical location: app.schemas.settings).
    "SettingsUpdate",
    "SettingsOut",
]

MIN_YEAR, MAX_YEAR = 1900, 2100


class RecordCreate(BaseModel):
    title: str = Field(min_length=1)
    review_type: str = ""
    period_start: int = Field(default_factory=lambda: date.today().year)
    period_end: int = Field(default_factory=lambda: date.today().year)
    staff_count: int | None = Field(default=2, ge=1, le=50)
    staff_names: list[str] | None = None

    @field_validator("title")
    @classmethod
    def _strip_title(cls, v: str) -> str:
        v = v.strip()
        if not v:
            raise ValueError("empty title")
        return v

    @field_validator("period_start", "period_end")
    @classmethod
    def _year_range(cls, v: int) -> int:
        if not MIN_YEAR <= v <= MAX_YEAR:
            raise ValueError(f"year out of range {MIN_YEAR}-{MAX_YEAR}")
        return v


class RecordUpdate(BaseModel):
    title: str | None = None
    review_type: str | None = None
    period_start: int | None = None
    period_end: int | None = None
    staff_count: int | None = None
    staff_names: list[str] | None = None


class RecordOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

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


class RecordRowOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    record_id: str
    company_id: str | None
    name_snapshot: str
    position: int
    assignee: str | None = None
    note: str | None = None


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
    model_config = ConfigDict(from_attributes=True)

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


class CellUpdate(BaseModel):
    reviewed: bool | None = None
    assignee: str | None = None
    note: str | None = None
    color: str | None = None
    style: dict | None = None


class CellBulkUpdate(BaseModel):
    ids: list[str] = Field(min_length=1)
    color: str | None = None
    style: dict | None = None
    reviewed: bool | None = None


class LayoutOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    section: str
    payload: dict
    updated_at: datetime


class LayoutUpdate(BaseModel):
    section: str
    payload: dict
