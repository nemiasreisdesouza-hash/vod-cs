"""Player profiles, reports, evolution and pro comparison."""
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.core import improvement_engine
from app.database import get_db
from app.deps import get_current_user
from app.models.match import Match
from app.models.player_stats import PlayerMatchStats, ProPlayerStats
from app.models.tactical_mistake import ImprovementPlan
from app.models.user import User
from app.schemas.player import PlayerReportOut

router = APIRouter(prefix="/api/players", tags=["players"])


def _mine_matches(db: Session, user: User):
    return [m.id for m in db.scalars(select(Match).where(Match.uploader_id == user.id)).all()]


@router.get("/{nickname}/profile")
def profile(nickname: str, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    rows = db.scalars(select(PlayerMatchStats).where(
        PlayerMatchStats.player_name == nickname, PlayerMatchStats.match_id.in_(_mine_matches(db, user) or [-1]))).all()
    if not rows:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Player not found")
    n = len(rows)
    return {
        "player_name": nickname,
        "matches": n,
        "rating": round(sum(r.rating for r in rows) / n, 2),
        "adr": round(sum(r.adr for r in rows) / n, 1),
        "hs_pct": round(sum(r.hs_pct for r in rows) / n, 1),
        "kast": round(sum(r.kast for r in rows) / n, 1),
        "kd_diff": sum(r.kills - r.deaths for r in rows),
    }


@router.get("/{nickname}/stats")
def stats(nickname: str, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    rows = db.scalars(select(PlayerMatchStats).where(
        PlayerMatchStats.player_name == nickname, PlayerMatchStats.match_id.in_(_mine_matches(db, user) or [-1]))).all()
    return [{"match_id": r.match_id, "kills": r.kills, "deaths": r.deaths, "assists": r.assists,
             "adr": r.adr, "rating": r.rating, "kast": r.kast, "hs_pct": r.hs_pct} for r in rows]


@router.get("/{nickname}/report", response_model=PlayerReportOut)
def report(nickname: str, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    rows = db.scalars(select(PlayerMatchStats).where(
        PlayerMatchStats.player_name == nickname, PlayerMatchStats.match_id.in_(_mine_matches(db, user) or [-1]))).all()
    if not rows:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Player not found")
    n = len(rows)
    agg = {
        "player_name": nickname,
        "kills": sum(r.kills for r in rows) / n, "deaths": sum(r.deaths for r in rows) / n,
        "assists": sum(r.assists for r in rows) / n,
        "rating": sum(r.rating for r in rows) / n, "adr": sum(r.adr for r in rows) / n,
        "hs_pct": sum(r.hs_pct for r in rows) / n, "kast": sum(r.kast for r in rows) / n,
        "impact": sum(r.impact for r in rows) / n,
        "flash_assists": sum(r.flash_assists for r in rows), "utility_damage": sum(r.utility_damage for r in rows),
        "first_kills": sum(r.first_kills for r in rows), "main_weapon": max(rows, key=lambda r: r.kills).main_weapon,
    }
    strengths, weaknesses, role, reason = improvement_engine.analyze(agg)
    drills = [improvement_engine.DRILLS.get(w.get("drill", "aim"), improvement_engine.DRILLS["aim"]) for w in weaknesses[:3]]
    pros = db.scalars(select(ProPlayerStats).where(ProPlayerStats.role == role)).all()
    pro = pros[0] if pros else None
    pro_cmp = {"role_avg": {"rating": pro.rating if pro else 1.05, "adr": pro.adr if pro else 78.0,
                            "hs_pct": pro.hs_pct if pro else 46.0, "kast": pro.kast if pro else 71.0},
               "percentiles": {k: min(99, int(50 + (agg[k] - improvement_engine.PRO_AVG[k]) * 8))
                               for k in ("rating", "adr", "hs_pct", "kast")}}
    evo = [{"match_id": r.match_id, "rating": r.rating, "adr": r.adr, "kast": r.kast} for r in rows]
    return PlayerReportOut(player_name=nickname, matches=n, rating=round(agg["rating"], 2),
                           kd_diff=sum(r.kills - r.deaths for r in rows), adr=round(agg["adr"], 1),
                           hs_pct=round(agg["hs_pct"], 1), kast=round(agg["kast"], 1),
                           impact=round(agg["impact"], 2), strengths=strengths, weaknesses=weaknesses,
                           suggested_role=role, role_reason=reason, drills=drills,
                           pro_comparison=pro_cmp, evolution=evo)


@router.get("/{nickname}/evolution")
def evolution(nickname: str, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    return stats(nickname, user, db)


@router.get("/{nickname}/comparison")
def comparison(nickname: str, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    rep = report(nickname, user, db)
    return rep.pro_comparison


@router.get("/{nickname}/improvement-plan")
def improvement_plan(nickname: str, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    plan = db.scalar(select(ImprovementPlan).where(ImprovementPlan.player_name == nickname)
                     .order_by(ImprovementPlan.id.desc()))
    if not plan:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "No improvement plan yet")
    return {"strengths": plan.strengths, "weaknesses": plan.weaknesses, "drills": plan.drills,
            "suggested_role": plan.suggested_role, "role_reason": plan.role_reason}
