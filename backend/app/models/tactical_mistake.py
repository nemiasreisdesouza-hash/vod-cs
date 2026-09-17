"""Tactical mistakes, heatmaps, annotations, improvement plans, subscriptions."""
from __future__ import annotations

from sqlalchemy import JSON, Float, ForeignKey, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column

from app.models.base import Base, TimestampMixin


class TacticalMistake(Base):
    __tablename__ = "tactical_mistakes"

    id: Mapped[int] = mapped_column(primary_key=True)
    match_id: Mapped[int] = mapped_column(ForeignKey("matches.id"), index=True)
    round_number: Mapped[int] = mapped_column(Integer, index=True)
    mistake_type: Mapped[str] = mapped_column(String(48), index=True)
    severity: Mapped[str] = mapped_column(String(16), default="medium")  # low|medium|high|critical
    timestamp_seconds: Mapped[float] = mapped_column(Float, default=0.0)
    title: Mapped[str] = mapped_column(String(200), default="")
    description: Mapped[str] = mapped_column(Text, default="")
    players_involved: Mapped[list] = mapped_column(JSON, default=list)
    suggestion: Mapped[str] = mapped_column(Text, default="")
    diagram: Mapped[dict] = mapped_column(JSON, default=dict)


class Heatmap(Base, TimestampMixin):
    __tablename__ = "heatmaps"

    id: Mapped[int] = mapped_column(primary_key=True)
    match_id: Mapped[int | None] = mapped_column(ForeignKey("matches.id"), nullable=True, index=True)
    team_id: Mapped[int | None] = mapped_column(ForeignKey("teams.id"), nullable=True)
    map_name: Mapped[str] = mapped_column(String(64), default="mirage")
    heatmap_type: Mapped[str] = mapped_column(String(24), default="kills")
    filters: Mapped[dict] = mapped_column(JSON, default=dict)
    points: Mapped[list] = mapped_column(JSON, default=list)
    image_url: Mapped[str] = mapped_column(String(1024), default="")


class VodAnnotation(Base, TimestampMixin):
    __tablename__ = "vod_annotations"

    id: Mapped[int] = mapped_column(primary_key=True)
    match_id: Mapped[int] = mapped_column(ForeignKey("matches.id"), index=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"))
    timestamp_seconds: Mapped[float] = mapped_column(Float, default=0.0)
    kind: Mapped[str] = mapped_column(String(16), default="note")  # error|good|note
    text: Mapped[str] = mapped_column(Text, default="")
    drawings: Mapped[list] = mapped_column(JSON, default=list)


class ImprovementPlan(Base, TimestampMixin):
    __tablename__ = "improvement_plans"

    id: Mapped[int] = mapped_column(primary_key=True)
    user_id: Mapped[int | None] = mapped_column(ForeignKey("users.id"), nullable=True)
    player_name: Mapped[str] = mapped_column(String(64), default="")
    match_id: Mapped[int | None] = mapped_column(ForeignKey("matches.id"), nullable=True)
    strengths: Mapped[list] = mapped_column(JSON, default=list)
    weaknesses: Mapped[list] = mapped_column(JSON, default=list)
    drills: Mapped[list] = mapped_column(JSON, default=list)
    suggested_role: Mapped[str] = mapped_column(String(24), default="")
    role_reason: Mapped[str] = mapped_column(Text, default="")


class Subscription(Base, TimestampMixin):
    __tablename__ = "subscriptions"

    id: Mapped[int] = mapped_column(primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"), unique=True, index=True)
    plan: Mapped[str] = mapped_column(String(16), default="free")
    status: Mapped[str] = mapped_column(String(16), default="active")
    analyses_used: Mapped[int] = mapped_column(Integer, default=0)
    analyses_limit: Mapped[int] = mapped_column(Integer, default=3)
    stripe_id: Mapped[str] = mapped_column(String(128), default="")
