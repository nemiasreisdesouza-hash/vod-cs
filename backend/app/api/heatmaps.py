"""Heatmap endpoints (match-scoped and team-aggregated)."""
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core import heatmap_generator
from app.database import get_db
from app.deps import get_current_user
from app.models.match import Match
from app.models.user import User
from app.schemas.match import HeatmapOut

router = APIRouter(tags=["heatmaps"])


@router.get("/api/matches/{match_id}/heatmap", response_model=HeatmapOut)
def match_heatmap(match_id: int, type: str = "kills", player: str = "all", side: str = "all",
                  user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    m = db.get(Match, match_id)
    if not m or m.uploader_id != user.id:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Match not found")
    if user.plan == "free" and type != "kills":
        raise HTTPException(status.HTTP_403_FORBIDDEN, "Upgrade to PRO for all heatmap types")
    points = heatmap_generator.generate(db, match_id, type, player, side, m.map_name)
    return HeatmapOut(map_name=m.map_name, heatmap_type=type, points=points,
                      filters={"player": player, "side": side})


@router.get("/api/teams/{team_id}/heatmap", response_model=HeatmapOut)
def team_heatmap(team_id: int, map: str = "mirage", type: str = "kills",
                 user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    matches = db.scalars(select(Match).where(Match.team_id == team_id, Match.uploader_id == user.id,
                                             Match.map_name == map)).all()
    points: list[dict] = []
    for m in matches[:5]:
        points += heatmap_generator.generate(db, m.id, type, map_name=map)[:800]
    return HeatmapOut(map_name=map, heatmap_type=type, points=points, filters={"team_id": team_id})
