"""Match / round / mistake / annotation schemas."""
from pydantic import BaseModel, Field


class MatchOut(BaseModel):
    id: int
    game: str
    map_name: str
    opponent: str
    title: str
    score_team: int
    score_enemy: int
    result: str
    duration_seconds: int
    status: str
    progress: int
    tags: list = []
    team_id: int | None
    mistake_count: int = 0

    model_config = {"from_attributes": True}


class RoundOut(BaseModel):
    id: int
    round_number: int
    side: str
    result: str
    win_reason: str
    buy_type: str
    equip_value_team: int
    equip_value_enemy: int
    score_team: int
    score_enemy: int
    timestamp_start: float

    model_config = {"from_attributes": True}


class PlayerStatsOut(BaseModel):
    player_name: str
    team: str
    kills: int
    deaths: int
    assists: int
    adr: float
    hs_pct: float
    kast: float
    rating: float
    impact: float
    flash_assists: int
    utility_damage: int
    first_kills: int
    first_deaths: int
    clutches_won: int
    clutches_attempted: int
    main_weapon: str

    model_config = {"from_attributes": True}


class MistakeOut(BaseModel):
    id: int
    round_number: int
    mistake_type: str
    severity: str
    timestamp_seconds: float
    title: str
    description: str
    players_involved: list
    suggestion: str
    diagram: dict

    model_config = {"from_attributes": True}


class AnnotationIn(BaseModel):
    timestamp_seconds: float = Field(ge=0)
    kind: str = Field(default="note", pattern="^(error|good|note)$")
    text: str = ""
    drawings: list = []


class AnnotationOut(AnnotationIn):
    id: int
    match_id: int
    user_id: int

    model_config = {"from_attributes": True}


class HeatmapOut(BaseModel):
    map_name: str
    heatmap_type: str
    points: list
    filters: dict = {}

    model_config = {"from_attributes": True}


class ManualRoundIn(BaseModel):
    """Fallback manual entry for CrossFire VODs the CV pipeline cannot parse."""

    round_number: int
    side: str = "ct"
    result: str = "win"
    kills: dict[str, int] = {}
    notes: str = ""
