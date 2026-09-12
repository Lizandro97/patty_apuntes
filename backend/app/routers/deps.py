from fastapi import Depends, Header, HTTPException
from jose import JWTError, jwt
from sqlalchemy.orm import Session

from app.core.config import settings
from app.db.session import get_db
from app.models.user import User


def get_current_user(
    authorization: str | None = Header(default=None), db: Session = Depends(get_db)
) -> User:
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(401, {"code": "UNAUTHORIZED", "message": "Unauthorized"})
    token = authorization.split(" ", 1)[1]
    try:
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
        user_id = payload.get("sub")
        if not user_id:
            raise HTTPException(401, {"code": "INVALID_TOKEN", "message": "Invalid token"})
    except JWTError as e:
        raise HTTPException(401, {"code": "INVALID_TOKEN", "message": "Invalid token"}) from e
    user = db.get(User, user_id)
    if not user:
        raise HTTPException(401, {"code": "USER_NOT_FOUND", "message": "User not found"})
    return user
