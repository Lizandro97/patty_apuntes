from datetime import datetime

from pydantic import BaseModel


class EmpresaCreate(BaseModel):
    nombre: str


class EmpresaUpdate(BaseModel):
    nombre: str


class EmpresaOut(BaseModel):
    id: str
    nombre: str
    created_at: datetime

    class Config:
        from_attributes = True
