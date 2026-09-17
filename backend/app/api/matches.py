"""Match upload, processing status and full analysis endpoints."""
from fastapi import APIRouter, Depends, Form, HTTPException, Query, UploadFile, status
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.config import settings
from app.database import get_db
from app.deps import get_current_user
from app.models.match import Match, PlayerRoundStats, RoundData
from app.models.player_stats import KillEvent, PlayerMatchStats, UtilityEvent
from app.models.tactical_mistake import TacticalMistake
from app.models.user import User
from app.schemas.match import ManualRoundIn, MatchOut, MistakeOut, PlayerStatsOut, RoundOut
from app.services import match_service
from app.utils import storage

router = APIRouter(prefix="/api/matches", tags=["matches"])

ALLOWED = {".dem": "cs2", ".mp4": "crossfire", ".mkv": "crossfire", ".avi": "crossfire"}


def _out(m: Match, db: Session) -> MatchOut:
    return MatchOut(id=m.id, game=m.game, map_name=m.map_name, opponent=m.opponent, title=m.title,
                    score_team=m.score_team, score_enemy=m.score_enemy, result=m.result,
                    duration_seconds=m.duration_seconds, status=m.status, progress=m.progress,
                    tags=m.tags or [], team_id=m.team_id, mistake_count=match_service.mistake_count(db, m.id))


def _owned(match: Match, user: User) -> bool:
    return match.uploader_id == user.id


@router.post("/upload", response_model=MatchOut)
async def upload(
    file: UploadFile,
    team_id: int | None = Form(None),
    opponent: str = Form(""),
    tags: str = Form(""),
    map_name: str = Form("mirage"),
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    name = file.filename or "demo.dem"
    ext = "." + name.rsplit(".", 1)[-1].lower() if "." in name else ""
    if ext not in ALLOWED:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, f"Unsupported file type {ext}. Use .dem, .mp4 or .mkv.")
    if match_service.quota_exceeded(db, user.id):
        raise HTTPException(status.HTTP_402_PAYMENT_REQUIRED, "Monthly analysis quota exceeded. Upgrade your plan.")
    data = await file.read()
    if len(data) > settings.max_upload_mb * 1024 * 1024:
        raise HTTPException(status.HTTP_413_REQUEST_ENTITY_TOO_LARGE, "File exceeds size limit")
    local = storage.save_upload(name, data)
    stored = storage.upload_file(local)
    game = ALLOWED[ext]
    match = Match(team_id=team_id, uploader_id=user.id, game=game,
                  map_name=map_name if game == "cs2" else (map_name or "black widow"),
                  opponent=opponent, title=f"vs {opponent or 'Adversário'} — {name}",
                  tags=[t.strip() for t in tags.split(",") if t.strip()],
                  demo_url=stored if game == "cs2" else "", vod_url=stored if game != "cs2" else "",
                  status="pending", progress=0)
    db.add(match)
    db.commit()
    db.refresh(match)
    # Async when a worker is available, inline otherwise (dev without worker still works).
    try:
        from app.tasks.process_demo import process_demo

        process_demo.delay(match.id, local)
        match.status = "processing"
        db.commit()
    except Exception:  # noqa: BLE001 - no broker: run inline
        from app.services import analysis_service

        analysis_service.run_full_analysis(db, match.id, local)
        db.refresh(match)
    return _out(match, db)


@router.get("", response_model=list[MatchOut])
def list_matches(
    team_id: int | None = None, q: str = "", tag: str = "", game: str = "",
    page: int = Query(1, ge=1), per_page: int = Query(20, ge=1, le=100),
    user: User = Depends(get_current_user), db: Session = Depends(get_db),
):
    query = select(Match).where(Match.uploader_id == user.id).order_by(Match.id.desc())
    if team_id:
        query = query.where(Match.team_id == team_id)
    if game:
        query = query.where(Match.game == game)
    matches = db.scalars(query.offset((page - 1) * per_page).limit(per_page)).all()
    if q:
        matches = [m for m in matches if q.lower() in (m.title + m.opponent + m.map_name).lower()]
    if tag:
        matches = [m for m in matches if tag in (m.tags or [])]
    return [_out(m, db) for m in matches]


@router.get("/{match_id}", response_model=MatchOut)
def get_match(match_id: int, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    m = db.get(Match, match_id)
    if not m or not _owned(m, user):
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Match not found")
    return _out(m, db)


@router.get("/{match_id}/status")
def get_status(match_id: int, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    m = db.get(Match, match_id)
    if not m or not _owned(m, user):
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Match not found")
    return {"status": m.status, "progress": m.progress, "error": m.error}


@router.get("/{match_id}/analysis")
def get_analysis(match_id: int, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    m = db.get(Match, match_id)
    if not m or not _owned(m, user):
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Match not found")
    rounds = db.scalars(select(RoundData).where(RoundData.match_id == match_id).order_by(RoundData.round_number)).all()
    first = [r for r in rounds if r.round_number <= 12]
    second = [r for r in rounds if r.round_number > 12]
    pistols = [r.round_number for r in rounds if r.buy_type == "pistol"]
    return {
        "match": _out(m, db).model_dump(),
        "first_half": {"team": sum(1 for r in first if r.result == "win"), "enemy": sum(1 for r in first if r.result == "loss")},
        "second_half": {"team": sum(1 for r in second if r.result == "win"), "enemy": sum(1 for r in second if r.result == "loss")},
        "pistol_rounds": pistols,
        "economy": [{"round": r.round_number, "team": r.equip_value_team, "enemy": r.equip_value_enemy, "buy": r.buy_type} for r in rounds],
    }


@router.get("/{match_id}/rounds", response_model=list[RoundOut])
def list_rounds(match_id: int, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    m = db.get(Match, match_id)
    if not m or not _owned(m, user):
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Match not found")
    return db.scalars(select(RoundData).where(RoundData.match_id == match_id).order_by(RoundData.round_number)).all()


@router.get("/{match_id}/rounds/{round_num}")
def round_detail(match_id: int, round_num: int, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    m = db.get(Match, match_id)
    if not m or not _owned(m, user):
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Match not found")
    r = db.scalar(select(RoundData).where(RoundData.match_id == match_id, RoundData.round_number == round_num))
    if not r:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Round not found")
    players = db.scalars(select(PlayerRoundStats).where(PlayerRoundStats.round_id == r.id)).all()
    kills = db.scalars(select(KillEvent).where(KillEvent.match_id == match_id, KillEvent.round_number == round_num)).all()
    utils = db.scalars(select(UtilityEvent).where(UtilityEvent.match_id == match_id, UtilityEvent.round_number == round_num)).all()
    mistakes = db.scalars(select(TacticalMistake).where(TacticalMistake.match_id == match_id, TacticalMistake.round_number == round_num)).all()
    return {
        "round": RoundOut.model_validate(r).model_dump(),
        "players": [{"player_name": p.player_name, "kills": p.kills, "deaths": p.deaths, "damage": p.damage,
                      "survived": p.survived} for p in players],
        "kills": [{"killer": k.killer, "victim": k.victim, "weapon": k.weapon, "headshot": k.headshot,
                    "time": k.time_seconds} for k in kills],
        "utility": [{"player": u.player, "type": u.util_type, "effective": u.effective} for u in utils],
        "mistakes": [MistakeOut.model_validate(x).model_dump() for x in mistakes],
    }


@router.post("/{match_id}/rounds/manual")
def manual_round(match_id: int, body: ManualRoundIn, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    """Manual fallback entry for CrossFire rounds the CV pipeline missed."""
    m = db.get(Match, match_id)
    if not m or not _owned(m, user):
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Match not found")
    r = db.scalar(select(RoundData).where(RoundData.match_id == match_id, RoundData.round_number == body.round_number))
    if not r:
        r = RoundData(match_id=match_id, round_number=body.round_number, side=body.side, result=body.result)
        db.add(r)
        db.flush()
    for player, kills in body.kills.items():
        db.add(PlayerRoundStats(round_id=r.id, match_id=match_id, player_name=player, kills=kills))
    db.commit()
    return {"ok": True, "round": body.round_number}


@router.get("/{match_id}/scoreboard", response_model=list[PlayerStatsOut])
def scoreboard(match_id: int, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    m = db.get(Match, match_id)
    if not m or not _owned(m, user):
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Match not found")
    return db.scalars(select(PlayerMatchStats).where(PlayerMatchStats.match_id == match_id)
                      .order_by(PlayerMatchStats.rating.desc())).all()


@router.get("/{match_id}/mistakes", response_model=list[MistakeOut])
def mistakes(match_id: int, severity: str = "", user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    m = db.get(Match, match_id)
    if not m or not _owned(m, user):
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Match not found")
    q = select(TacticalMistake).where(TacticalMistake.match_id == match_id).order_by(TacticalMistake.round_number)
    if severity:
        q = q.where(TacticalMistake.severity == severity)
    return db.scalars(q).all()


@router.get("/{match_id}/timeline")
def timeline(match_id: int, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    m = db.get(Match, match_id)
    if not m or not _owned(m, user):
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Match not found")
    kills = db.scalars(select(KillEvent).where(KillEvent.match_id == match_id).order_by(KillEvent.time_seconds)).all()
    mistakes = db.scalars(select(TacticalMistake).where(TacticalMistake.match_id == match_id)).all()
    events = [{"t": k.time_seconds, "kind": "kill", "round": k.round_number, "text": f"{k.killer} ▸ {k.victim} ({k.weapon})"} for k in kills]
    events += [{"t": x.timestamp_seconds, "kind": "mistake", "round": x.round_number, "text": x.title, "severity": x.severity} for x in mistakes]
    return sorted(events, key=lambda e: e["t"])


@router.get("/{match_id}/economy")
def economy(match_id: int, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    m = db.get(Match, match_id)
    if not m or not _owned(m, user):
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Match not found")
    rounds = db.scalars(select(RoundData).where(RoundData.match_id == match_id).order_by(RoundData.round_number)).all()
    return [{"round": r.round_number, "team": r.equip_value_team, "enemy": r.equip_value_enemy,
             "buy": r.buy_type, "result": r.result} for r in rounds]


@router.delete("/{match_id}")
def delete_match(match_id: int, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    m = db.get(Match, match_id)
    if not m or not _owned(m, user):
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Match not found")
    db.delete(m)
    db.commit()
    return {"ok": True}
