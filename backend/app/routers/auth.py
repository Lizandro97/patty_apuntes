from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.core.security import create_access_token, hash_password, verify_password
from app.db.session import get_db
from app.models.user import User
from app.routers.deps import get_current_user
from app.schemas.auth import LoginIn, RegisterIn, TokenOut, UserOut

router = APIRouter(prefix="/auth", tags=["auth"])


@router.post("/register", response_model=UserOut)
def register(data: RegisterIn, db: Session = Depends(get_db)):
    if db.query(User).filter(User.email == data.email).first():
        raise HTTPException(400, "Email ya registrado")
    u = User(
        email=data.email, hashed_password=hash_password(data.password), full_name=data.full_name
    )
    db.add(u)
    db.commit()
    db.refresh(u)
    return u


@router.post("/login", response_model=TokenOut)
def login(data: LoginIn, db: Session = Depends(get_db)):
    u = db.query(User).filter(User.email == data.email).first()
    if not u or not verify_password(data.password, u.hashed_password):
        raise HTTPException(401, "Credenciales inválidas")
    token = create_access_token({"sub": u.id})
    return {"access_token": token}


@router.get("/me", response_model=UserOut)
def me(user: User = Depends(get_current_user)):
    return user
