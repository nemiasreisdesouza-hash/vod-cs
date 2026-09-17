"""Dashboard overview, team stats, recent matches and top issues."""
from fastapi import APIRouter, Depends
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.core.tactical_engine import MISTAKE_META
from app.database import get_db
from app.deps import get_current_user
from app.models.match import Match
from app.models.player_stats import PlayerMatchStats
from app.models.tactical_mistake import TacticalMistake
from app.models.user import User

router = APIRouter(prefix="/api/dashboard", tags=["dashboard"])


def _mine(db: Session, user: User):
    return select(Match).where(Match.uploader_id == user.id)


@router.get("/overview")
def overview(user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    matches = db.scalars(_mine(db, user).order_by(Match.id.desc()).limit(50)).all()
    completed = [m for m in matches if m.status == "completed"]
    wins = sum(1 for m in completed if m.result == "win")
    mids = [m.id for m in completed] or [-1]
    avg_rating = db.scalar(select(func.avg(PlayerMatchStats.rating)).where(
        PlayerMatchStats.match_id.in_(mids), PlayerMatchStats.team == "team")) or 0
    avg_adr = db.scalar(select(func.avg(PlayerMatchStats.adr)).where(
        PlayerMatchStats.match_id.in_(mids), PlayerMatchStats.team == "team")) or 0
    total_mistakes = db.scalar(select(func.count()).where(TacticalMistake.match_id.in_(mids))) or 0
    by_map: dict[str, dict] = {}
    for m in completed:
        d = by_map.setdefault(m.map_name, {"matches": 0, "wins": 0})
        d["matches"] += 1
        d["wins"] += 1 if m.result == "win" else 0
    evolution = [{"match_id": m.id, "title": m.title, "result": m.result,
                  "score": f"{m.score_team}-{m.score_enemy}"} for m in reversed(completed[-10:])]
    return {
        "matches_analyzed": len(completed),
        "win_rate": round(100 * wins / len(completed), 1) if completed else 0,
        "avg_rating": round(float(avg_rating), 2),
        "avg_adr": round(float(avg_adr), 1),
        "avg_mistakes": round(total_mistakes / len(completed), 1) if completed else 0,
        "by_map": {k: {**v, "win_rate": round(100 * v["wins"] / v["matches"], 1)} for k, v in by_map.items()},
        "evolution": evolution,
    }


@router.get("/recent-matches")
def recent_matches(user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    matches = db.scalars(_mine(db, user).order_by(Match.id.desc()).limit(10)).all()
    out = []
    for m in matches:
        n = db.scalar(select(func.count()).where(TacticalMistake.match_id == m.id)) or 0
        out.append({"id": m.id, "title": m.title, "game": m.game, "map_name": m.map_name,
                    "opponent": m.opponent, "score_team": m.score_team, "score_enemy": m.score_enemy,
                    "result": m.result, "status": m.status, "mistakes": n})
    return out


@router.get("/top-issues")
def top_issues(user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    mids = [m.id for m in db.scalars(_mine(db, user)).all()] or [-1]
    rows = db.execute(select(TacticalMistake.mistake_type, func.count().label("n"))
                      .where(TacticalMistake.match_id.in_(mids))
                      .group_by(TacticalMistake.mistake_type).order_by(func.count().desc()).limit(5)).all()
    return [{"type": t, "count": n, **MISTAKE_META.get(t, {"label": t, "severity": "medium"})} for t, n in rows]


@router.get("/team/{team_id}")
def team_dashboard(team_id: int, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    matches = db.scalars(select(Match).where(Match.team_id == team_id, Match.uploader_id == user.id)
                         .order_by(Match.id.desc()).limit(30)).all()
    mids = [m.id for m in matches] or [-1]
    players = db.execute(
        select(PlayerMatchStats.player_name, func.avg(PlayerMatchStats.rating).label("rating"),
               func.avg(PlayerMatchStats.adr).label("adr"), func.sum(PlayerMatchStats.kills).label("k"),
               func.sum(PlayerMatchStats.deaths).label("d"))
        .where(PlayerMatchStats.match_id.in_(mids), PlayerMatchStats.team == "team")
        .group_by(PlayerMatchStats.player_name).order_by(func.avg(PlayerMatchStats.rating).desc())).all()
    return {
        "matches": len(matches),
        "win_rate": round(100 * sum(1 for m in matches if m.result == "win") / len(matches), 1) if matches else 0,
        "ranking": [{"player": p[0], "rating": round(float(p[1]), 2), "adr": round(float(p[2]), 1),
                     "k": int(p[3]), "d": int(p[4])} for p in players],
    }
