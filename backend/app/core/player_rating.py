"""HLTV Rating 2.0 approximation + supporting metrics.

Reference formula (community reverse-engineered approximation):
    Rating = 0.0073*KAST + 0.3591*KPR - 0.5329*DPR
             + 0.2372*Impact + 0.0032*ADR + 0.1587
KAST is 0..100, KPR/DPR per-round, Impact ~0..2.
"""


def kast_percent(kast_rounds: int, rounds_played: int) -> float:
    if rounds_played <= 0:
        return 0.0
    return round(100.0 * kast_rounds / rounds_played, 1)


def adr(damage: int, rounds_played: int) -> float:
    if rounds_played <= 0:
        return 0.0
    return round(damage / rounds_played, 1)


def hs_percent(hs_kills: int, kills: int) -> float:
    if kills <= 0:
        return 0.0
    return round(100.0 * hs_kills / kills, 1)


def impact_rating(
    kills: int,
    assists: int,
    rounds: int,
    opening_kills: int = 0,
    opening_deaths: int = 0,
    clutches_won: int = 0,
    multi_kill_rounds: int = 0,
) -> float:
    """Impact ~1.0 is average. Rewards openers, multis and clutches."""
    if rounds <= 0:
        return 0.0
    base = (kills * 1.0 + assists * 0.5) / rounds
    opener_bonus = (opening_kills - opening_deaths) * 0.15 / max(rounds / 10, 1)
    multi_bonus = multi_kill_rounds * 0.25 / max(rounds / 10, 1)
    clutch_bonus = clutches_won * 0.3 / max(rounds / 10, 1)
    return round(max(base + opener_bonus + multi_bonus + clutch_bonus, 0.0), 2)


def rating_2_0(kast: float, kpr: float, dpr: float, impact: float, adr_value: float) -> float:
    raw = 0.0073 * kast + 0.3591 * kpr - 0.5329 * dpr + 0.2372 * impact + 0.0032 * adr_value + 0.1587
    return round(max(raw, 0.0), 2)


def opening_rating(first_kills: int, first_deaths: int) -> float:
    total = first_kills + first_deaths
    if total == 0:
        return 0.0
    return round((first_kills - first_deaths) / total, 2)


def clutch_rate(won: int, attempted: int) -> float:
    if attempted == 0:
        return 0.0
    return round(100.0 * won / attempted, 1)
