"""Player report schemas."""
from pydantic import BaseModel


class PlayerReportOut(BaseModel):
    player_name: str
    matches: int
    rating: float
    kd_diff: float
    adr: float
    hs_pct: float
    kast: float
    impact: float
    strengths: list[dict] = []
    weaknesses: list[dict] = []
    suggested_role: str = ""
    role_reason: str = ""
    drills: list[dict] = []
    pro_comparison: dict = {}
    evolution: list[dict] = []
