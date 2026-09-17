"""Team CRUD, members and invites."""
import secrets

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.database import get_db
from app.deps import get_current_user
from app.models.team import Team, TeamInvite, TeamMember
from app.models.user import User
from app.schemas.team import InviteCreate, InviteOut, MemberAdd, MemberOut, TeamCreate, TeamOut, TeamUpdate

router = APIRouter(prefix="/api/teams", tags=["teams"])


def _out(team: Team, db: Session) -> TeamOut:
    count = db.query(TeamMember).filter_by(team_id=team.id).count()
    return TeamOut(id=team.id, name=team.name, logo_url=team.logo_url, game=team.game,
                   owner_id=team.owner_id, invite_code=team.invite_code, member_count=count)


def _mine(team: Team, user: User, db: Session) -> bool:
    if team.owner_id == user.id:
        return True
    return db.scalar(select(TeamMember).where(TeamMember.team_id == team.id, TeamMember.user_id == user.id)) is not None


@router.post("", response_model=TeamOut)
def create_team(body: TeamCreate, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    team = Team(name=body.name, game=body.game, logo_url=body.logo_url, owner_id=user.id,
                invite_code=secrets.token_hex(4))
    db.add(team)
    db.flush()
    db.add(TeamMember(team_id=team.id, user_id=user.id, nickname=user.nickname or user.name, role="IGL"))
    db.commit()
    db.refresh(team)
    return _out(team, db)


@router.get("", response_model=list[TeamOut])
def list_teams(user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    member_team_ids = [r.team_id for r in db.scalars(select(TeamMember).where(TeamMember.user_id == user.id)).all()]
    teams = db.scalars(select(Team).where((Team.owner_id == user.id) | (Team.id.in_(member_team_ids or [-1])))).all()
    return [_out(t, db) for t in teams]


@router.get("/{team_id}", response_model=TeamOut)
def get_team(team_id: int, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    team = db.get(Team, team_id)
    if not team or not _mine(team, user, db):
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Team not found")
    return _out(team, db)


@router.put("/{team_id}", response_model=TeamOut)
def update_team(team_id: int, body: TeamUpdate, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    team = db.get(Team, team_id)
    if not team or team.owner_id != user.id:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Team not found")
    if body.name:
        team.name = body.name
    if body.logo_url is not None:
        team.logo_url = body.logo_url
    if body.game:
        team.game = body.game
    db.commit()
    return _out(team, db)


@router.delete("/{team_id}")
def delete_team(team_id: int, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    team = db.get(Team, team_id)
    if not team or team.owner_id != user.id:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Team not found")
    db.delete(team)
    db.commit()
    return {"ok": True}


@router.get("/{team_id}/members", response_model=list[MemberOut])
def list_members(team_id: int, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    team = db.get(Team, team_id)
    if not team or not _mine(team, user, db):
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Team not found")
    return db.scalars(select(TeamMember).where(TeamMember.team_id == team_id)).all()


@router.post("/{team_id}/members", response_model=MemberOut)
def add_member(team_id: int, body: MemberAdd, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    team = db.get(Team, team_id)
    if not team or team.owner_id != user.id:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Team not found")
    target = db.scalar(select(User).where(User.email == body.email)) if body.email else None
    member = TeamMember(team_id=team_id, user_id=target.id if target else None,
                        nickname=body.nickname or (target.nickname if target else ""),
                        role=body.role or "Rifler")
    db.add(member)
    db.commit()
    db.refresh(member)
    return member


@router.delete("/{team_id}/members/{member_id}")
def remove_member(team_id: int, member_id: int, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    team = db.get(Team, team_id)
    if not team or team.owner_id != user.id:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Team not found")
    member = db.get(TeamMember, member_id)
    if not member or member.team_id != team_id:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Member not found")
    db.delete(member)
    db.commit()
    return {"ok": True}


@router.post("/{team_id}/invite", response_model=InviteOut)
def invite(team_id: int, body: InviteCreate, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    team = db.get(Team, team_id)
    if not team or team.owner_id != user.id:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Team not found")
    inv = TeamInvite(team_id=team_id, email=body.email, code=secrets.token_urlsafe(8))
    db.add(inv)
    db.commit()
    db.refresh(inv)
    return inv


@router.post("/join/{invite_code}", response_model=MemberOut)
def join(invite_code: str, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    inv = db.scalar(select(TeamInvite).where(TeamInvite.code == invite_code, TeamInvite.status == "pending"))
    team = db.scalar(select(Team).where(Team.invite_code == invite_code)) if not inv else None
    team_id = inv.team_id if inv else (team.id if team else None)
    if not team_id:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Invalid invite code")
    existing = db.scalar(select(TeamMember).where(TeamMember.team_id == team_id, TeamMember.user_id == user.id))
    if existing:
        return existing
    member = TeamMember(team_id=team_id, user_id=user.id, nickname=user.nickname or user.name, role="Rifler")
    db.add(member)
    if inv:
        inv.status = "accepted"
    db.commit()
    db.refresh(member)
    return member
