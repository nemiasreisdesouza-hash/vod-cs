"""Orchestrates parsing + tactical analysis + persistence for one match."""
import logging

from sqlalchemy.orm import Session

from app.core import improvement_engine, tactical_engine
from app.core.crossfire_analyzer import analyze_crossfire_vod
from app.core.cs2_parser import parse_cs2_demo
from app.models.match import Match, PlayerRoundStats, RoundData
from app.models.player_stats import KillEvent, PlayerMatchStats, PositionData, UtilityEvent
from app.models.tactical_mistake import TacticalMistake
from app.services import match_service

log = logging.getLogger(__name__)


def run_full_analysis(db: Session, match_id: int, local_path: str) -> None:
    """Parse a demo/VOD file and persist every derived artifact."""
    match = db.get(Match, match_id)
    if not match:
        return
    try:
        match_service.set_status(db, match_id, "processing", 5)
        if match.game == "crossfire":
            parsed = analyze_crossfire_vod(local_path, map_name=match.map_name)
        else:
            parsed = parse_cs2_demo(local_path, map_name=match.map_name)
        match_service.set_status(db, match_id, "processing", 45)

        # --- persist rounds ---
        match.score_team = parsed["score_team"]
        match.score_enemy = parsed["score_enemy"]
        match.result = "win" if match.score_team > match.score_enemy else ("loss" if match.score_team < match.score_enemy else "draw")
        match.duration_seconds = parsed.get("duration_seconds", 0)
        match.map_name = parsed.get("map_name", match.map_name)
        db.flush()
        for r in parsed["rounds"]:
            row = RoundData(match_id=match.id, **{k: v for k, v in r.items() if hasattr(RoundData, k)})
            db.add(row)
            db.flush()
            for pr in r.get("players", []):
                db.add(PlayerRoundStats(round_id=row.id, match_id=match.id, **{k: v for k, v in pr.items() if hasattr(PlayerRoundStats, k)}))
        for k in parsed.get("kills", []):
            db.add(KillEvent(match_id=match.id, **{kk: v for kk, v in k.items() if hasattr(KillEvent, kk)}))
        for u in parsed.get("utility", []):
            db.add(UtilityEvent(match_id=match.id, **{kk: v for kk, v in u.items() if hasattr(UtilityEvent, kk)}))
        for p in parsed.get("positions_sampled", []):
            db.add(PositionData(match_id=match.id, **{kk: v for kk, v in p.items() if hasattr(PositionData, kk)}))
        for ps in parsed.get("player_stats", []):
            db.add(PlayerMatchStats(match_id=match.id, **{kk: v for kk, v in ps.items() if hasattr(PlayerMatchStats, kk)}))
        db.flush()
        match_service.set_status(db, match_id, "processing", 70)

        # --- tactical analysis ---
        mistakes = tactical_engine.detect_all(parsed)
        for m in mistakes:
            db.add(TacticalMistake(match_id=match.id, **m))
        # improvement plans per team player
        for ps in parsed.get("player_stats", []):
            if ps.get("team") == "team":
                improvement_engine.build_and_save(db, match.id, ps, parsed.get("rounds", []))
        db.commit()
        match_service.set_status(db, match.id, "completed", 100)
        match_service.bump_usage(db, match.uploader_id)
    except Exception as exc:  # noqa: BLE001 - surface failure to the user
        log.exception("Analysis failed for match %s", match_id)
        db.rollback()
        match_service.set_status(db, match_id, "failed", 0, error=str(exc)[:500])
