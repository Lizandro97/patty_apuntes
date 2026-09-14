from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.models.settings import Settings
from app.models.user import User
from app.routers.deps import get_current_user
from app.schemas.record import SettingsOut, SettingsUpdate

router = APIRouter(prefix="/settings", tags=["settings"])


@router.get("", response_model=SettingsOut)
def get_settings(db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    cfg = db.query(Settings).filter(Settings.user_id == user.id).first()
    if not cfg:
        cfg = Settings(user_id=user.id)
        db.add(cfg)
        db.commit()
        db.refresh(cfg)
    return cfg


@router.put("", response_model=SettingsOut)
def update_settings(
    data: SettingsUpdate, db: Session = Depends(get_db), user: User = Depends(get_current_user)
):
    cfg = db.query(Settings).filter(Settings.user_id == user.id).first()
    if not cfg:
        cfg = Settings(user_id=user.id)
        db.add(cfg)
    for k, v in data.model_dump(exclude_unset=True).items():
        setattr(cfg, k, v)
    db.commit()
    db.refresh(cfg)
    return cfg
