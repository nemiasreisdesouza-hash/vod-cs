"""Register every model so Base.metadata is complete."""
from app.models.base import Base  # noqa: F401
from app.models.match import Match, PlayerRoundStats, RoundData  # noqa: F401
from app.models.player_stats import (  # noqa: F401
    KillEvent,
    PlayerMatchStats,
    PlayerProfile,
    PositionData,
    ProPlayerStats,
    UtilityEvent,
)
from app.models.tactical_mistake import (  # noqa: F401
    Heatmap,
    ImprovementPlan,
    Subscription,
    TacticalMistake,
    VodAnnotation,
)
from app.models.team import Team, TeamInvite, TeamMember  # noqa: F401
from app.models.user import Notification, PasswordResetToken, User  # noqa: F401
