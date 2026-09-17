from app.core.player_rating import impact_rating, kast_percent, rating_2_0


def test_kast():
    assert kast_percent(15, 20) == 75.0
    assert kast_percent(0, 0) == 0.0


def test_rating_pro_like():
    r = rating_2_0(kast=74.0, kpr=0.85, dpr=0.6, impact=1.25, adr_value=86.0)
    assert 1.0 < r < 1.6


def test_impact_scales_with_kills():
    assert impact_rating(20, 5, 20) > impact_rating(10, 5, 20)
