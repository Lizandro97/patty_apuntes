from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.models.empresa import Empresa
from app.models.user import User
from app.routers.deps import get_current_user
from app.schemas.empresa import EmpresaCreate, EmpresaOut, EmpresaUpdate

router = APIRouter(prefix="/empresas", tags=["empresas"])


@router.get("", response_model=list[EmpresaOut])
def list_empresas(db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    return db.query(Empresa).filter(Empresa.user_id == user.id).order_by(Empresa.created_at).all()


@router.post("", response_model=EmpresaOut)
def create(
    data: EmpresaCreate, db: Session = Depends(get_db), user: User = Depends(get_current_user)
):
    e = Empresa(user_id=user.id, nombre=data.nombre.strip())
    db.add(e)
    try:
        db.commit()
        db.refresh(e)
    except Exception as e2:
        db.rollback()
        raise HTTPException(400, "Empresa ya existe") from e2
    return e


@router.put("/{eid}", response_model=EmpresaOut)
def update(
    eid: str,
    data: EmpresaUpdate,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    e = db.query(Empresa).filter(Empresa.id == eid, Empresa.user_id == user.id).first()
    if not e:
        raise HTTPException(404, "No encontrada")
    e.nombre = data.nombre.strip()
    db.commit()
    db.refresh(e)
    return e


@router.delete("/{eid}")
def delete(eid: str, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    e = db.query(Empresa).filter(Empresa.id == eid, Empresa.user_id == user.id).first()
    if not e:
        raise HTTPException(404, "No encontrada")
    db.delete(e)
    db.commit()
    return {"ok": True}
