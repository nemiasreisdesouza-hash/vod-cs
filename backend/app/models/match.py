"""Matches, rounds and per-round / per-match stats."""
from __future__ import annotations

from sqlalchemy import JSON, Float, ForeignKey, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base, TimestampMixin


class Match(Base, TimestampMixin):
    __tablename__ = "matches"

    id: Mapped[int] = mapped_column(primary_key=True)
    team_id: Mapped[int | None] = mapped_column(ForeignKey("teams.id"), nullable=True, index=True)
    uploader_id: Mapped[int] = mapped_column(ForeignKey("users.id"), index=True)
    game: Mapped[str] = mapped_column(String(16), default="cs2")
    map_name: Mapped[str] = mapped_column(String(64), default="mirage")
    opponent: Mapped[str] = mapped_column(String(120), default="")
    score_team: Mapped[int] = mapped_column(Integer, default=0)
    score_enemy: Mapped[int] = mapped_column(Integer, default=0)
    result: Mapped[str] = mapped_column(String(8), default="")  # win|loss|draw
    duration_seconds: Mapped[int] = mapped_column(Integer, default=0)
    demo_url: Mapped[str] = mapped_column(String(1024), default="")
    vod_url: Mapped[str] = mapped_column(String(1024), default="")
    status: Mapped[str] = mapped_column(String(16), default="pending", index=True)
    progress: Mapped[int] = mapped_column(Integer, default=0)
    error: Mapped[str] = mapped_column(Text, default="")
    tags: Mapped[list] = mapped_column(JSON, default=list)
    title: Mapped[str] = mapped_column(String(200), default="")

    rounds: Mapped[list["RoundData"]] = relationship(back_populates="match", cascade="all, delete-orphan")
    player_stats: Mapped[list["PlayerMatchStats"]] = relationship(back_populates="match", cascade="all, delete-orphan")


class RoundData(Base):
    __tablename__ = "round_data"

    id: Mapped[int] = mapped_column(primary_key=True)
    match_id: Mapped[int] = mapped_column(ForeignKey("matches.id"), index=True)
    round_number: Mapped[int] = mapped_column(Integer)
    side: Mapped[str] = mapped_column(String(4), default="ct")  # ct|t
    result: Mapped[str] = mapped_column(String(8), default="")  # win|loss
    win_reason: Mapped[str] = mapped_column(String(24), default="elimination")
    buy_type: Mapped[str] = mapped_column(String(16), default="full")  # pistol|eco|force|full
    equip_value_team: Mapped[int] = mapped_column(Integer, default=0)
    equip_value_enemy: Mapped[int] = mapped_column(Integer, default=0)
    score_team: Mapped[int] = mapped_column(Integer, default=0)
    score_enemy: Mapped[int] = mapped_column(Integer, default=0)
    timestamp_start: Mapped[float] = mapped_column(Float, default=0.0)
    bomb_planted: Mapped[bool] = mapped_column(default=False)  # type: ignore[assignment]

    match: Mapped[Match] = relationship(back_populates="rounds")
    player_rounds: Mapped[list["PlayerRoundStats"]] = relationship(back_populates="round", cascade="all, delete-orphan")


class PlayerRoundStats(Base):
    __tablename__ = "player_round_stats"

    id: Mapped[int] = mapped_column(primary_key=True)
    round_id: Mapped[int] = mapped_column(ForeignKey("round_data.id"), index=True)
    match_id: Mapped[int] = mapped_column(ForeignKey("matches.id"), index=True)
    player_name: Mapped[str] = mapped_column(String(64), index=True)
    side: Mapped[str] = mapped_column(String(4), default="ct")
    kills: Mapped[int] = mapped_column(Integer, default=0)
    deaths: Mapped[int] = mapped_column(Integer, default=0)
    assists: Mapped[int] = mapped_column(Integer, default=0)
    damage: Mapped[int] = mapped_column(Integer, default=0)
    hs_kills: Mapped[int] = mapped_column(Integer, default=0)
    flash_assists: Mapped[int] = mapped_column(Integer, default=0)
    utility_damage: Mapped[int] = mapped_column(Integer, default=0)
    survived: Mapped[bool] = mapped_column(default=False)  # type: ignore[assignment]
    first_kill: Mapped[bool] = mapped_column(default=False)  # type: ignore[assignment]
    first_death: Mapped[bool] = mapped_column(default=False)  # type: ignore[assignment]

    round: Mapped[RoundData] = relationship(back_populates="player_rounds")
