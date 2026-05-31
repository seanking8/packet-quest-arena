import json

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
            assert incident["affectedLinkIds"], "storm/wind must name affected nearby links"
            assert incident["visualZone"] is not None


def test_construction_and_fibre_cut_are_not_weather():
    # Force a run that includes non-weather types and verify the separation.
    seen_non_weather = False
    for incident in _many(seed=99, n=400):
        if incident["eventType"] in ("CONSTRUCTION", "FIBRE_CUT"):
            seen_non_weather = True
            assert not is_weather(incident["eventType"])
            assert incident["eventType"] not in WEATHER_TYPES
            assert incident["affectedLinkTypes"] == ["FIBRE"]
            assert incident["affectedLinkIds"]
    assert seen_non_weather, "expected some construction/fibre-cut events across the run"


def test_link_failures_target_one_link():
    seen = False
    for incident in _many(seed=321, n=500):
        if incident["eventType"] in ("FIBRE_CUT", "LINK_FAILURE"):
            seen = True
            assert incident["targetType"] == "LINK"
            assert incident["targetId"] in incident["affectedLinkIds"]
            assert len(incident["affectedLinkIds"]) == 1
    assert seen, "expected at least one link-targeted failure"


def test_recovery_carries_targeted_links_when_possible():
    seen = False
    for incident in _many(seed=55, n=300):
        if incident["eventType"] == RECOVERY_TYPE and incident["affectedLinkIds"]:
            seen = True
            assert incident["visualZone"] is not None
    assert seen, "expected recovery to carry affected links from remembered incidents"


def test_seed_is_repeatable():
    assert _many(seed=555, n=20) == _many(seed=555, n=20)


def test_easy_difficulty_is_gentler_than_hard():
    easy = IncidentGenerator(seed=4, difficulty="EASY")
    hard = IncidentGenerator(seed=4, difficulty="HARD")

    assert easy.next_interval_seconds() >= hard.next_interval_seconds()
    easy_incidents = [easy.next_incident() for _ in range(80)]
    hard_incidents = [hard.next_incident() for _ in range(80)]

    assert max(i["severity"] for i in easy_incidents) <= 0.45
    assert max(i["severity"] for i in hard_incidents) >= 0.5
    assert not any(i["eventType"] == "NODE_FAILURE" for i in easy_incidents)


def test_incident_is_json_serializable_with_exact_schema():
    # The incident must round-trip through JSON unchanged (it is POSTed as JSON)
    # and expose exactly the schema fields the backend expects, no more.
    for incident in _many(n=50):
        restored = json.loads(json.dumps(incident))
        assert restored == incident
        assert set(restored.keys()) == REQUIRED_FIELDS


def test_values_stay_within_backend_accepted_bounds():
    # Contract with the backend: severity in [0, 1] and duration in [0, 300].
    # If the simulator ever exceeded these, the backend would reject the POST.
    for incident in _many(n=300):
        assert 0.0 <= incident["severity"] <= 1.0
        assert 0 <= incident["durationSeconds"] <= 300
