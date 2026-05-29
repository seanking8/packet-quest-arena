from simulator.incidents import (
    IncidentGenerator, NON_WEATHER_TYPES, RECOVERY_TYPE,
    SEVERITY_RANGE, DURATION_RANGE, INTERVAL_RANGE,
)
from simulator.weather import WEATHER_TYPES, is_weather

REQUIRED_FIELDS = {
    "eventType", "targetType", "targetId", "severity", "durationSeconds",
    "message", "affectedLinkTypes", "affectedNodeIds", "affectedLinkIds", "visualZone",
}


def _many(seed=123, n=200):
    gen = IncidentGenerator(seed=seed)
    return [gen.next_incident() for _ in range(n)]


def test_incident_has_required_fields():
    for incident in _many():
        assert REQUIRED_FIELDS.issubset(incident.keys())


def test_event_types_are_known():
    valid = set(WEATHER_TYPES) | set(NON_WEATHER_TYPES) | {RECOVERY_TYPE}
    for incident in _many():
        assert incident["eventType"] in valid


def test_severity_within_range():
    lo, hi = SEVERITY_RANGE
    for incident in _many():
        # weather-clear and recovery are 0.0; others within the configured band
        assert incident["severity"] == 0.0 or lo <= incident["severity"] <= hi


def test_duration_within_range():
    lo, hi = DURATION_RANGE
    for incident in _many():
        assert lo <= incident["durationSeconds"] <= hi


def test_interval_within_range():
    gen = IncidentGenerator(seed=1)
    lo, hi = INTERVAL_RANGE
    for _ in range(50):
        assert lo <= gen.next_interval_seconds() <= hi


def test_weather_events_include_affected_link_types():
    for incident in _many():
        if is_weather(incident["eventType"]) and incident["eventType"] != "WEATHER_CLEAR":
            assert incident["affectedLinkTypes"], "storm/wind must affect some link types"
            assert incident["visualZone"] is not None


def test_construction_and_fibre_cut_are_not_weather():
    # Force a run that includes non-weather types and verify the separation.
    seen_non_weather = False
    for incident in _many(seed=99, n=400):
        if incident["eventType"] in ("CONSTRUCTION", "FIBRE_CUT"):
            seen_non_weather = True
            assert not is_weather(incident["eventType"])
            assert incident["eventType"] not in WEATHER_TYPES
    assert seen_non_weather, "expected some construction/fibre-cut events across the run"


def test_seed_is_repeatable():
    assert _many(seed=555, n=20) == _many(seed=555, n=20)
