"""Authentication endpoints."""
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.deps import get_current_user
from app.models.user import User
from app.schemas.auth import ForgotIn, LoginIn, RefreshIn, RegisterIn, ResetIn, TokenOut, UserOut, UserUpdateIn
from app.services import auth_service
from app.utils.security import create_access_token, create_refresh_token, decode_token

router = APIRouter(prefix="/api/auth", tags=["auth"])


@router.post("/register", response_model=TokenOut)
def register(body: RegisterIn, db: Session = Depends(get_db)):
    try:
        user = auth_service.register(db, body.email, body.password, body.name, body.nickname)
    except auth_service.AuthError as exc:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, str(exc)) from exc
    return TokenOut(access_token=create_access_token(user.id), refresh_token=create_refresh_token(user.id))


@router.post("/login", response_model=TokenOut)
def login(body: LoginIn, db: Session = Depends(get_db)):
    try:
        _, access, refresh = auth_service.authenticate(db, body.email, body.password)
    except auth_service.AuthError as exc:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, str(exc)) from exc
    return TokenOut(access_token=access, refresh_token=refresh)


@router.post("/refresh", response_model=TokenOut)
def refresh(body: RefreshIn, db: Session = Depends(get_db)):
    payload = decode_token(body.refresh_token)
    if not payload or payload.get("type") != "refresh":
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Invalid refresh token")
    user = db.get(User, int(payload["sub"]))
    if not user:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "User not found")
    return TokenOut(access_token=create_access_token(user.id), refresh_token=create_refresh_token(user.id))


@router.post("/forgot-password")
def forgot(body: ForgotIn, db: Session = Depends(get_db)):
    token = auth_service.create_reset_token(db, body.email)
    # Dev: return token so the flow is testable without SMTP. Production emails it.
    return {"ok": True, "dev_token": token}


@router.post("/reset-password")
def reset(body: ResetIn, db: Session = Depends(get_db)):
    try:
        auth_service.reset_password(db, body.token, body.new_password)
    except auth_service.AuthError as exc:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, str(exc)) from exc
    return {"ok": True}


@router.get("/me", response_model=UserOut)
def me(user: User = Depends(get_current_user)):
    return user


@router.put("/me", response_model=UserOut)
def update_me(body: UserUpdateIn, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    for field in ("name", "nickname", "avatar_url", "steam_id"):
        value = getattr(body, field)
        if value is not None:
            setattr(user, field, value)
    db.commit()
    db.refresh(user)
    return user
