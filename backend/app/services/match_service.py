"""Match listing helpers, quotas and status transitions."""
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.models.match import Match
from app.models.tactical_mistake import Subscription, TacticalMistake


def quota_exceeded(db: Session, user_id: int) -> bool:
    sub = db.scalar(select(Subscription).where(Subscription.user_id == user_id))
    if not sub:
        return False
    return sub.analyses_used >= sub.analyses_limit


def bump_usage(db: Session, user_id: int) -> None:
    sub = db.scalar(select(Subscription).where(Subscription.user_id == user_id))
    if sub:
        sub.analyses_used += 1
        db.commit()


def mistake_count(db: Session, match_id: int) -> int:
    return db.scalar(select(func.count()).where(TacticalMistake.match_id == match_id)) or 0


def set_status(db: Session, match_id: int, status: str, progress: int = 0, error: str = "") -> None:
    m = db.get(Match, match_id)
    if m:
        m.status = status
        m.progress = progress
        if error:
            m.error = error
        db.commit()
