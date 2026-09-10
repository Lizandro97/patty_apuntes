from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.models.config import Configuracion
from app.models.user import User
from app.routers.deps import get_current_user
from app.schemas.archivo import ConfigOut, ConfigUpdate

router = APIRouter(prefix="/config", tags=["config"])


@router.get("", response_model=ConfigOut)
def get_config(db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    cfg = db.query(Configuracion).filter(Configuracion.user_id == user.id).first()
    if not cfg:
        cfg = Configuracion(user_id=user.id)
        db.add(cfg)
        db.commit()
        db.refresh(cfg)
    return cfg


@router.put("", response_model=ConfigOut)
def update_config(
    data: ConfigUpdate, db: Session = Depends(get_db), user: User = Depends(get_current_user)
):
    cfg = db.query(Configuracion).filter(Configuracion.user_id == user.id).first()
    if not cfg:
        cfg = Configuracion(user_id=user.id)
        db.add(cfg)
    for k, v in data.model_dump(exclude_unset=True).items():
        setattr(cfg, k, v)
    db.commit()
    db.refresh(cfg)
    return cfg
