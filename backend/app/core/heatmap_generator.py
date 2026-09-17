"""Heatmap point generation from stored events/positions."""
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.player_stats import KillEvent, PositionData, UtilityEvent
from app.utils.map_coordinates import overview_to_normalized


def generate(
    db: Session,
    match_id: int,
    heatmap_type: str = "kills",
    player: str = "all",
    side: str = "all",
    map_name: str = "mirage",
    limit: int = 5000,
) -> list[dict]:
    """Return normalized 0..1 points with intensity for the frontend canvas."""
    pts: list[dict] = []
    if heatmap_type in ("kills", "deaths"):
        rows = db.scalars(select(KillEvent).where(KillEvent.match_id == match_id).limit(limit)).all()
        for k in rows:
            x, y = (k.victim_x, k.victim_y)
            who = k.killer if heatmap_type == "kills" else k.victim
            if player != "all" and who != player:
                continue
            nx, ny = overview_to_normalized(map_name, x, y)
            pts.append({"x": round(nx, 4), "y": round(ny, 4), "w": 1.0, "label": f"{k.killer} → {k.victim}"})
    elif heatmap_type == "utility":
        rows = db.scalars(select(UtilityEvent).where(UtilityEvent.match_id == match_id).limit(limit)).all()
        for u in rows:
            if player != "all" and u.player != player:
                continue
            nx, ny = overview_to_normalized(map_name, u.pos_x, u.pos_y)
            pts.append({"x": round(nx, 4), "y": round(ny, 4), "w": 0.8, "label": f"{u.player} {u.util_type}"})
    else:  # positions
        q = select(PositionData).where(PositionData.match_id == match_id)
        if player != "all":
            q = q.where(PositionData.player == player)
        if side != "all":
            q = q.where(PositionData.side == side)
        rows = db.scalars(q.limit(limit)).all()
        for p in rows:
            nx, ny = overview_to_normalized(map_name, p.x, p.y)
            pts.append({"x": round(nx, 4), "y": round(ny, 4), "w": 0.35})
    return pts
