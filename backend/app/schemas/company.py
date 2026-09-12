from datetime import datetime

from pydantic import BaseModel


class CompanyCreate(BaseModel):
    name: str


class CompanyUpdate(BaseModel):
    name: str


class CompanyOut(BaseModel):
    id: str
    name: str
    created_at: datetime

    class Config:
        from_attributes = True
