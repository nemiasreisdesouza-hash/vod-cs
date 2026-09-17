"""Aggregated match stats, kill/utility/position events, pro reference data."""
from __future__ import annotations

from sqlalchemy import JSON, Boolean, Float, ForeignKey, Integer, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base, TimestampMixin


class PlayerMatchStats(Base, TimestampMixin):
    __tablename__ = "player_match_stats"

    id: Mapped[int] = mapped_column(primary_key=True)
    match_id: Mapped[int] = mapped_column(ForeignKey("matches.id"), index=True)
    player_name: Mapped[str] = mapped_column(String(64), index=True)
    user_id: Mapped[int | None] = mapped_column(ForeignKey("users.id"), nullable=True)
    team: Mapped[str] = mapped_column(String(16), default="team")  # team|enemy
    kills: Mapped[int] = mapped_column(Integer, default=0)
    deaths: Mapped[int] = mapped_column(Integer, default=0)
    assists: Mapped[int] = mapped_column(Integer, default=0)
    adr: Mapped[float] = mapped_column(Float, default=0.0)
    hs_pct: Mapped[float] = mapped_column(Float, default=0.0)
    kast: Mapped[float] = mapped_column(Float, default=0.0)
    rating: Mapped[float] = mapped_column(Float, default=0.0)
    impact: Mapped[float] = mapped_column(Float, default=0.0)
    flash_assists: Mapped[int] = mapped_column(Integer, default=0)
    utility_damage: Mapped[int] = mapped_column(Integer, default=0)
    first_kills: Mapped[int] = mapped_column(Integer, default=0)
    first_deaths: Mapped[int] = mapped_column(Integer, default=0)
    clutches_won: Mapped[int] = mapped_column(Integer, default=0)
    clutches_attempted: Mapped[int] = mapped_column(Integer, default=0)
    trades: Mapped[int] = mapped_column(Integer, default=0)
    main_weapon: Mapped[str] = mapped_column(String(32), default="")
    damage_total: Mapped[int] = mapped_column(Integer, default=0)
    rounds_played: Mapped[int] = mapped_column(Integer, default=0)

    match: Mapped["Match"] = relationship(back_populates="player_stats")


class KillEvent(Base):
    __tablename__ = "kill_events"

    id: Mapped[int] = mapped_column(primary_key=True)
    match_id: Mapped[int] = mapped_column(ForeignKey("matches.id"), index=True)
    round_number: Mapped[int] = mapped_column(Integer, index=True)
    tick: Mapped[int] = mapped_column(Integer, default=0)
    time_seconds: Mapped[float] = mapped_column(Float, default=0.0)
    killer: Mapped[str] = mapped_column(String(64), default="")
    victim: Mapped[str] = mapped_column(String(64), default="")
    weapon: Mapped[str] = mapped_column(String(32), default="")
    headshot: Mapped[bool] = mapped_column(Boolean, default=False)
    wallbang: Mapped[bool] = mapped_column(Boolean, default=False)
    flashed: Mapped[bool] = mapped_column(Boolean, default=False)
    distance: Mapped[float] = mapped_column(Float, default=0.0)
    killer_x: Mapped[float] = mapped_column(Float, default=0.0)
    killer_y: Mapped[float] = mapped_column(Float, default=0.0)
    victim_x: Mapped[float] = mapped_column(Float, default=0.0)
    victim_y: Mapped[float] = mapped_column(Float, default=0.0)
    is_trade: Mapped[bool] = mapped_column(Boolean, default=False)


class UtilityEvent(Base):
    __tablename__ = "utility_events"

    id: Mapped[int] = mapped_column(primary_key=True)
    match_id: Mapped[int] = mapped_column(ForeignKey("matches.id"), index=True)
    round_number: Mapped[int] = mapped_column(Integer, index=True)
    player: Mapped[str] = mapped_column(String(64), default="")
    util_type: Mapped[str] = mapped_column(String(16), default="smoke")
    time_seconds: Mapped[float] = mapped_column(Float, default=0.0)
    pos_x: Mapped[float] = mapped_column(Float, default=0.0)
    pos_y: Mapped[float] = mapped_column(Float, default=0.0)
    enemies_blinded: Mapped[int] = mapped_column(Integer, default=0)
    damage: Mapped[int] = mapped_column(Integer, default=0)
    effective: Mapped[bool] = mapped_column(Boolean, default=True)


class PositionData(Base):
    __tablename__ = "position_data"

    id: Mapped[int] = mapped_column(primary_key=True)
    match_id: Mapped[int] = mapped_column(ForeignKey("matches.id"), index=True)
    round_number: Mapped[int] = mapped_column(Integer, index=True)
    tick: Mapped[int] = mapped_column(Integer, default=0)
    time_seconds: Mapped[float] = mapped_column(Float, default=0.0)
    player: Mapped[str] = mapped_column(String(64), index=True)
    side: Mapped[str] = mapped_column(String(4), default="ct")
    x: Mapped[float] = mapped_column(Float, default=0.0)
    y: Mapped[float] = mapped_column(Float, default=0.0)
    z: Mapped[float] = mapped_column(Float, default=0.0)
    alive: Mapped[bool] = mapped_column(Boolean, default=True)


class ProPlayerStats(Base):
    __tablename__ = "pro_player_stats"

    id: Mapped[int] = mapped_column(primary_key=True)
    nickname: Mapped[str] = mapped_column(String(64))
    role: Mapped[str] = mapped_column(String(24), default="Rifler")
    game: Mapped[str] = mapped_column(String(16), default="cs2")
    rating: Mapped[float] = mapped_column(Float, default=1.0)
    adr: Mapped[float] = mapped_column(Float, default=75.0)
    kd_diff: Mapped[float] = mapped_column(Float, default=0.0)
    hs_pct: Mapped[float] = mapped_column(Float, default=45.0)
    kast: Mapped[float] = mapped_column(Float, default=70.0)
    impact: Mapped[float] = mapped_column(Float, default=1.0)


class PlayerProfile(Base, TimestampMixin):
    __tablename__ = "player_profiles"

    id: Mapped[int] = mapped_column(primary_key=True)
    user_id: Mapped[int | None] = mapped_column(ForeignKey("users.id"), nullable=True)
    team_id: Mapped[int | None] = mapped_column(ForeignKey("teams.id"), nullable=True)
    nickname: Mapped[str] = mapped_column(String(64), index=True)
    game: Mapped[str] = mapped_column(String(16), default="cs2")
    role: Mapped[str] = mapped_column(String(24), default="Rifler")
    matches_played: Mapped[int] = mapped_column(Integer, default=0)
    rating_avg: Mapped[float] = mapped_column(Float, default=0.0)
    extra: Mapped[dict] = mapped_column(JSON, default=dict)
