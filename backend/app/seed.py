"""Seed demo data: 3 users, 1 team, 5 analyzed matches, pro stats."""
import json
import logging
import secrets
from datetime import datetime, timezone
from pathlib import Path

from sqlalchemy import select

from app.database import SessionLocal
from app.models.match import Match
from app.models.player_stats import ProPlayerStats
from app.models.team import Team, TeamMember
from app.models.tactical_mistake import Subscription
from app.models.user import Notification, User
from app.services import analysis_service
from app.services.auth_service import PLAN_LIMITS
from app.utils.security import hash_password

log = logging.getLogger(__name__)

USERS = [
    ("free@vod.gg", "free123", "Free Player", "freezin", "free"),
    ("pro@vod.gg", "pro123", "Pro Player", "prozinhx", "pro"),
    ("coach@vod.gg", "team123", "Coach Carter", "coachc", "team"),
]
MAPS = ["mirage", "inferno", "dust2", "nuke", "ancient"]
OPPONENTS = ["MIBR Academy", "FURIA fe", "paiN Academy", "Imperial fe", "RED Canids"]


def run() -> None:
    db = SessionLocal()
    try:
        if db.scalar(select(User).where(User.email == "pro@vod.gg")):
            log.info("Seed already applied")
            return
        users: dict[str, User] = {}
        for email, pwd, name, nick, plan in USERS:
            u = User(email=email, hashed_password=hash_password(pwd), name=name, nickname=nick, plan=plan)
            db.add(u)
            db.flush()
            db.add(Subscription(user_id=u.id, plan=plan, analyses_limit=PLAN_LIMITS[plan]))
            users[plan] = u
        db.flush()
        team = Team(name="VOD Esportas", game="cs2", owner_id=users["team"].id,
                    invite_code=secrets.token_hex(4))
        db.add(team)
        db.flush()
        for nick, role in [("FalleN", "IGL"), ("fer", "Entry"), ("coldzera", "Rifler"),
                           ("TACO", "Support"), ("fnx", "Lurker")]:
            db.add(TeamMember(team_id=team.id, nickname=nick, role=role))
        db.add(TeamMember(team_id=team.id, user_id=users["team"].id, nickname="coachc", role="Coach"))
        # pro reference stats
        pro_path = Path(__file__).parent.parent / "data" / "pro_stats" / "pro_players.json"
        for row in json.loads(pro_path.read_text()):
            db.add(ProPlayerStats(**row))
        db.commit()
        # 5 analyzed matches (synthetic pipeline, no real files needed)
        for i, (map_name, opp) in enumerate(zip(MAPS, OPPONENTS)):
            m = Match(team_id=team.id, uploader_id=users["team"].id, game="cs2", map_name=map_name,
                      opponent=opp, title=f"vs {opp} — {map_name}",
                      tags=["scrim" if i % 2 == 0 else "torneio"], demo_url=f"seed://demo-{i}.dem")
            db.add(m)
            db.commit()
            analysis_service.run_full_analysis(db, m.id, f"seed-demo-{i}")
            log.info("Seeded match %s (%s)", m.id, map_name)
        db.add(Notification(user_id=users["team"].id, title="Bem-vindo à VOD Analyst Pro!",
                            message="5 partidas de exemplo foram analisadas para você explorar.",
                            kind="success", link="/dashboard",
                            created_at=datetime.now(timezone.utc)))
        db.commit()
        log.info("Seed complete")
    finally:
        db.close()
