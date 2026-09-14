from fastapi import APIRouter, Depends, HTTPException, Request
from jose import JWTError, jwt
from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.ratelimit import check
from app.core.security import (
    create_access_token,
    create_refresh_token,
    hash_password,
    verify_password,
)
from app.db.session import get_db
from app.models.user import User
from app.routers.deps import get_current_user
from app.schemas.auth import LoginIn, RefreshIn, RegisterIn, TokenOut, UserOut

router = APIRouter(prefix="/auth", tags=["auth"])


@router.post("/register", response_model=UserOut)
def register(data: RegisterIn, db: Session = Depends(get_db)):
    if db.query(User).filter(User.email == data.email).first():
        raise HTTPException(400, {"code": "EMAIL_TAKEN", "message": "Email already registered"})
    u = User(
        email=data.email, hashed_password=hash_password(data.password), full_name=data.full_name
    )
    db.add(u)
    db.commit()
    db.refresh(u)
    return u


@router.post("/login", response_model=TokenOut)
def login(data: LoginIn, request: Request, db: Session = Depends(get_db)):
    ip = request.client.host if request.client else "unknown"
    if not check(
        f"login:{ip}:{data.email}",
        settings.LOGIN_MAX_ATTEMPTS,
        settings.LOGIN_WINDOW_SECONDS,
    ):
        raise HTTPException(429, {"code": "RATE_LIMITED", "message": "Too many attempts"})
    u = db.query(User).filter(User.email == data.email).first()
    if not u or not verify_password(data.password, u.hashed_password):
        raise HTTPException(401, {"code": "INVALID_CREDENTIALS", "message": "Invalid credentials"})
    return {
        "access_token": create_access_token({"sub": u.id}),
        "refresh_token": create_refresh_token(u.id),
    }


@router.post("/refresh", response_model=TokenOut)
def refresh(data: RefreshIn, db: Session = Depends(get_db)):
    try:
        payload = jwt.decode(
            data.refresh_token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM]
        )
        if payload.get("type") != "refresh" or not payload.get("sub"):
            raise HTTPException(401, {"code": "INVALID_TOKEN", "message": "Invalid token"})
        user_id = payload["sub"]
    except JWTError as e:
        raise HTTPException(401, {"code": "INVALID_TOKEN", "message": "Invalid token"}) from e
    if not db.get(User, user_id):
        raise HTTPException(401, {"code": "USER_NOT_FOUND", "message": "User not found"})
    return {
        "access_token": create_access_token({"sub": user_id}),
        "refresh_token": create_refresh_token(user_id),
    }


@router.get("/me", response_model=UserOut)
def me(user: User = Depends(get_current_user)):
    return user
