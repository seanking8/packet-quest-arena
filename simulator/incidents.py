"""
Network chaos engine for Packet Quest Arena.

Generates weather and non-weather incident events as JSON-serialisable dicts in
the shape the Spring Boot backend accepts at
POST /api/sessions/{sessionId}/incidents.

Deterministic when constructed with a seed, so behaviour is repeatable in tests.
"""
import random

try:  # works both as a package (tests) and flat (Docker image)
    from simulator.weather import (
        WEATHER_TYPES, WEATHER_LINK_TYPES, WEATHER_MESSAGES, ZONES, is_weather,
    )
    from simulator.topology import link_ids_in_zone
except ImportError:  # pragma: no cover
    from weather import (
        WEATHER_TYPES, WEATHER_LINK_TYPES, WEATHER_MESSAGES, ZONES, is_weather,
    )
    from topology import link_ids_in_zone

# Non-weather incidents are kept separate from weather.
NON_WEATHER_TYPES = [
    "CONSTRUCTION",
    "FIBRE_CUT",
    "BUILDING_OBSTRUCTION",
    "LINK_CONGESTION",
    "PACKET_LOSS_SPIKE",
    "LATENCY_SPIKE",
    "POWER_OUTAGE",
    "NODE_FAILURE",
    "NODE_DEGRADED",
    "LINK_FAILURE",
]
RECOVERY_TYPE = "RECOVERY"

# Link types affected by each non-weather incident (by category).
FIBRE_TYPES = ["FIBRE"]
LINE_OF_SIGHT_TYPES = ["MMWAVE", "RADIO"]

SEVERITY_RANGE = (0.2, 0.8)
DURATION_RANGE = (15, 45)      # seconds an incident lasts
INTERVAL_RANGE = (10, 20)      # seconds between incidents

# Generation mix: weather, non-weather, recovery.
WEATHER_PROBABILITY = 0.45
RECOVERY_PROBABILITY = 0.15

DIFFICULTY_CONFIG = {
    "EASY": {
        "weather_probability": 0.30,
        "recovery_probability": 0.25,
        "severity_range": (0.12, 0.45),
        "duration_range": (12, 35),
        "interval_range": (14, 24),
        "non_weather_types": [
            "CONSTRUCTION",
            "BUILDING_OBSTRUCTION",
            "LINK_CONGESTION",
            "PACKET_LOSS_SPIKE",
            "LATENCY_SPIKE",
            "NODE_DEGRADED",
        ],
    },
    "MEDIUM": {
        "weather_probability": WEATHER_PROBABILITY,
        "recovery_probability": RECOVERY_PROBABILITY,
        "severity_range": SEVERITY_RANGE,
        "duration_range": DURATION_RANGE,
        "interval_range": INTERVAL_RANGE,
        "non_weather_types": NON_WEATHER_TYPES,
    },
    "HARD": {
        "weather_probability": 0.55,
        "recovery_probability": 0.10,
        "severity_range": (0.35, 0.90),
        "duration_range": (20, 55),
        "interval_range": (7, 14),
        "non_weather_types": NON_WEATHER_TYPES,
    },
}


class IncidentGenerator:
    """Produces incident dicts. Seeded for repeatability."""

    def __init__(self, seed=None, difficulty="MEDIUM"):
        self.rng = random.Random(seed)
        self._recent_targets = []
        self.difficulty = str(difficulty or "MEDIUM").upper()
        self.config = DIFFICULTY_CONFIG.get(self.difficulty, DIFFICULTY_CONFIG["MEDIUM"])

    def next_interval_seconds(self):
        """Conceptual delay before the next incident (10-20s)."""
        return self.rng.randint(*self.config["interval_range"])

    def next_incident(self):
        roll = self.rng.random()
        weather_probability = self.config["weather_probability"]
        recovery_probability = self.config["recovery_probability"]
        if roll < weather_probability:
            return self._weather()
        if roll < weather_probability + recovery_probability and self._recent_targets:
            return self._recovery()
        return self._non_weather()

    # --- helpers -------------------------------------------------------

    def _severity(self):
        return round(self.rng.uniform(*self.config["severity_range"]), 2)

    def _duration(self):
        return self.rng.randint(*self.config["duration_range"])

    def _zone(self):
        return dict(self.rng.choice(ZONES))

    def _incident(self, event_type, target_type, target_id, severity, message,
                  affected_link_types=None, affected_node_ids=None,
                  affected_link_ids=None, visual_zone=None):
        return {
            "eventType": event_type,
            "targetType": target_type,
            "targetId": target_id,
            "severity": severity,
            "durationSeconds": self._duration(),
            "message": message,
            "affectedLinkTypes": affected_link_types or [],
            "affectedNodeIds": affected_node_ids or [],
            "affectedLinkIds": affected_link_ids or [],
            "visualZone": visual_zone,
        }

    def _weather(self):
        event_type = self.rng.choice(WEATHER_TYPES)
        zone = self._zone()
        link_types = list(WEATHER_LINK_TYPES[event_type])
        link_ids = [] if event_type == "WEATHER_CLEAR" else link_ids_in_zone(zone, link_types)
        severity = 0.0 if event_type == "WEATHER_CLEAR" else self._severity()
        message = WEATHER_MESSAGES[event_type].format(zone=zone["id"])
        self._remember(
            zone["id"],
            visual_zone=zone,
            affected_link_ids=link_ids,
            affected_link_types=link_types,
        )
        return self._incident(
            event_type, "ZONE", zone["id"], severity, message,
            affected_link_types=link_types,
            affected_link_ids=link_ids,
            visual_zone=zone)

    def _non_weather(self):
        event_type = self.rng.choice(self.config["non_weather_types"])
        zone = self._zone()
        severity = self._severity()
        link_types = []
        target_type = "ZONE"
        target_id = zone["id"]
        if event_type in ("FIBRE_CUT", "CONSTRUCTION", "LINK_FAILURE"):
            link_types = list(FIBRE_TYPES)
        elif event_type == "BUILDING_OBSTRUCTION":
            link_types = list(LINE_OF_SIGHT_TYPES)
        elif event_type in ("LINK_CONGESTION", "PACKET_LOSS_SPIKE", "LATENCY_SPIKE"):
            link_types = [self.rng.choice(["RADIO", "MMWAVE", "MICROWAVE", "FIBRE"])]
        link_ids = link_ids_in_zone(zone, link_types) if link_types else []
        if event_type in ("FIBRE_CUT", "LINK_FAILURE") and link_ids:
            link_ids = [self.rng.choice(link_ids)]
            target_type = "LINK"
            target_id = link_ids[0]
        message = f"{event_type.replace('_', ' ').title()} near {zone['id']}."
        self._remember(
            target_id,
            target_type=target_type,
            visual_zone=zone,
            affected_link_ids=link_ids,
            affected_link_types=link_types,
        )
        return self._incident(
            event_type, target_type, target_id, severity, message,
            affected_link_types=link_types,
            affected_link_ids=link_ids,
            visual_zone=zone)

    def _recovery(self):
        target = self.rng.choice(self._recent_targets)
        return self._incident(
            RECOVERY_TYPE,
            target["targetType"],
            target["targetId"],
            0.0,
            f"Conditions at {target['targetId']} are recovering.",
            affected_link_types=target["affectedLinkTypes"],
            affected_node_ids=target["affectedNodeIds"],
            affected_link_ids=target["affectedLinkIds"],
            visual_zone=target["visualZone"])

    def _remember(self, target_id, target_type="ZONE", visual_zone=None,
                  affected_link_ids=None, affected_node_ids=None,
                  affected_link_types=None):
        target = {
            "targetType": target_type,
            "targetId": target_id,
            "visualZone": visual_zone,
            "affectedLinkTypes": affected_link_types or [],
            "affectedNodeIds": affected_node_ids or [],
            "affectedLinkIds": affected_link_ids or [],
        }
        key = (target["targetType"], target["targetId"])
        if all((item["targetType"], item["targetId"]) != key for item in self._recent_targets):
            self._recent_targets.append(target)
        # keep the memory small
        self._recent_targets = self._recent_targets[-6:]
