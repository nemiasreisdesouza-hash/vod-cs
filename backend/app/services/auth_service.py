"""Registration, login and password-reset business logic."""
import secrets
from datetime import datetime, timedelta, timezone

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.tactical_mistake import Subscription
from app.models.user import PasswordResetToken, User
from app.utils.security import create_access_token, create_refresh_token, hash_password, verify_password

PLAN_LIMITS = {"free": 3, "pro": 20, "team": 10_000}


class AuthError(ValueError):
    pass


def register(db: Session, email: str, password: str, name: str, nickname: str) -> User:
    if db.scalar(select(User).where(User.email == email)):
        raise AuthError("Email already registered")
    user = User(email=email, hashed_password=hash_password(password), name=name, nickname=nickname or name)
    db.add(user)
    db.flush()
    db.add(Subscription(user_id=user.id, plan="free", analyses_limit=PLAN_LIMITS["free"]))
    db.commit()
    db.refresh(user)
    return user


def authenticate(db: Session, email: str, password: str) -> tuple[User, str, str]:
    user = db.scalar(select(User).where(User.email == email))
    if not user or not verify_password(password, user.hashed_password):
        raise AuthError("Invalid email or password")
    if not user.is_active:
        raise AuthError("Account disabled")
    return user, create_access_token(user.id), create_refresh_token(user.id)


def create_reset_token(db: Session, email: str) -> str | None:
    user = db.scalar(select(User).where(User.email == email))
    if not user:
        return None
    token = secrets.token_urlsafe(32)
    db.add(
        PasswordResetToken(
            user_id=user.id, token=token, expires_at=datetime.now(timezone.utc) + timedelta(hours=2)
        )
    )
    db.commit()
    return token  # in production: email this link to the user


def reset_password(db: Session, token: str, new_password: str) -> None:
    row = db.scalar(select(PasswordResetToken).where(PasswordResetToken.token == token, PasswordResetToken.used.is_(False)))
    if not row or row.expires_at.replace(tzinfo=timezone.utc) < datetime.now(timezone.utc):
        raise AuthError("Invalid or expired token")
    user = db.get(User, row.user_id)
    if not user:
        raise AuthError("Invalid token")
    user.hashed_password = hash_password(new_password)
    row.used = True
    db.commit()
