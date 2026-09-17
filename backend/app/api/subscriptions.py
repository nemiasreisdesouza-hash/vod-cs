"""Plans and (mock) checkout."""
from fastapi import APIRouter, Depends
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.database import get_db
from app.deps import get_current_user
from app.models.tactical_mistake import Subscription
from app.models.user import User
from app.services.auth_service import PLAN_LIMITS
from app.schemas.match import HeatmapOut  # noqa: F401 (keep schemas importable)

router = APIRouter(prefix="/api/subscriptions", tags=["subscriptions"])

PLANS = [
    {"id": "free", "name": "FREE", "price": 0, "analyses": 3,
     "features": ["3 análises/mês", "Estatísticas básicas", "1 heatmap por partida", "1 mapa"]},
    {"id": "pro", "name": "PRO", "price": 9.99, "analyses": 20,
     "features": ["20 análises/mês", "Análise tática completa", "Todos os heatmaps", "Relatório individual",
                  "VOD player com anotações", "Comparação com pros", "Exportar PDF"]},
    {"id": "team", "name": "TEAM", "price": 29.99, "analyses": -1,
     "features": ["Análises ilimitadas", "Tudo do PRO", "Dashboard do time (10 membros)",
                  "Plano de melhoria do time", "Compartilhar com coach", "API de integração", "Suporte prioritário"]},
]


@router.get("/plans")
def plans():
    return PLANS


@router.get("/current")
def current(user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    sub = db.scalar(select(Subscription).where(Subscription.user_id == user.id))
    if not sub:
        sub = Subscription(user_id=user.id, plan="free", analyses_limit=PLAN_LIMITS["free"])
        db.add(sub)
        db.commit()
    return {"plan": sub.plan, "status": sub.status, "used": sub.analyses_used, "limit": sub.analyses_limit}


@router.post("/checkout")
def checkout(plan: str = "pro", user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    """Mock checkout — in production this creates a Stripe session."""
    if plan not in PLAN_LIMITS:
        plan = "pro"
    sub = db.scalar(select(Subscription).where(Subscription.user_id == user.id))
    assert sub is not None
    sub.plan = plan
    sub.status = "active"
    sub.analyses_limit = PLAN_LIMITS[plan]
    user.plan = plan
    db.commit()
    return {"ok": True, "plan": plan, "checkout": "mock — Stripe aqui em produção"}


@router.post("/cancel")
def cancel(user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    sub = db.scalar(select(Subscription).where(Subscription.user_id == user.id))
    assert sub is not None
    sub.plan = "free"
    sub.status = "canceled"
    sub.analyses_limit = PLAN_LIMITS["free"]
    user.plan = "free"
    db.commit()
    return {"ok": True}
