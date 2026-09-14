from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.models.company import Company
from app.models.user import User
from app.routers.deps import get_current_user
from app.schemas.company import CompanyCreate, CompanyOut, CompanyUpdate

router = APIRouter(prefix="/companies", tags=["companies"])


@router.get("", response_model=list[CompanyOut])
def list_companies(db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    return db.query(Company).filter(Company.user_id == user.id).order_by(Company.created_at).all()


@router.post("", response_model=CompanyOut)
def create(
    data: CompanyCreate, db: Session = Depends(get_db), user: User = Depends(get_current_user)
):
    e = Company(user_id=user.id, name=data.name.strip())
    db.add(e)
    try:
        db.commit()
        db.refresh(e)
    except Exception as e2:
        db.rollback()
        raise HTTPException(
            400, {"code": "COMPANY_EXISTS", "message": "Company already exists"}
        ) from e2
    return e


@router.put("/{company_id}", response_model=CompanyOut)
def update(
    company_id: str,
    data: CompanyUpdate,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    e = db.query(Company).filter(Company.id == company_id, Company.user_id == user.id).first()
    if not e:
        raise HTTPException(404, {"code": "COMPANY_NOT_FOUND", "message": "Not found"})
    e.name = data.name.strip()
    db.commit()
    db.refresh(e)
    return e


@router.delete("/{company_id}")
def delete(company_id: str, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    e = db.query(Company).filter(Company.id == company_id, Company.user_id == user.id).first()
    if not e:
        raise HTTPException(404, {"code": "COMPANY_NOT_FOUND", "message": "Not found"})
    db.delete(e)
    db.commit()
    return {"ok": True}
