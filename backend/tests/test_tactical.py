from app.core.cs2_parser import synthetic_match
from app.core.tactical_engine import detect_all


def test_pipeline_produces_mistakes():
    parsed = synthetic_match("test-seed")
    mistakes = detect_all(parsed)
    assert len(mistakes) > 0
    assert all(m["severity"] in ("low", "medium", "high", "critical") for m in mistakes)


def test_rounds_shape():
    parsed = synthetic_match("test-seed-2", map_name="inferno")
    assert parsed["map_name"] == "inferno"
    assert 15 <= len(parsed["rounds"]) <= 24
    assert len(parsed["player_stats"]) == 10
