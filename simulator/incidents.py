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
except ImportError:  # pragma: no cover
    from weather import (
        WEATHER_TYPES, WEATHER_LINK_TYPES, WEATHER_MESSAGES, ZONES, is_weather,
    )

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


class IncidentGenerator:
    """Produces incident dicts. Seeded for repeatability."""

    def __init__(self, seed=None):
        self.rng = random.Random(seed)
        self._recent_targets = []

    def next_interval_seconds(self):
        """Conceptual delay before the next incident (10-20s)."""
        return self.rng.randint(*INTERVAL_RANGE)

    def next_incident(self):
        roll = self.rng.random()
        if roll < WEATHER_PROBABILITY:
            return self._weather()
        if roll < WEATHER_PROBABILITY + RECOVERY_PROBABILITY and self._recent_targets:
            return self._recovery()
        return self._non_weather()

    # --- helpers -------------------------------------------------------

    def _severity(self):
        return round(self.rng.uniform(*SEVERITY_RANGE), 2)

    def _duration(self):
        return self.rng.randint(*DURATION_RANGE)

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
        severity = 0.0 if event_type == "WEATHER_CLEAR" else self._severity()
        message = WEATHER_MESSAGES[event_type].format(zone=zone["id"])
        self._remember(zone["id"])
        return self._incident(
            event_type, "ZONE", zone["id"], severity, message,
            affected_link_types=link_types, visual_zone=zone)

    def _non_weather(self):
        event_type = self.rng.choice(NON_WEATHER_TYPES)
        zone = self._zone()
        severity = self._severity()
        link_types = []
        if event_type in ("FIBRE_CUT", "CONSTRUCTION", "LINK_FAILURE"):
            link_types = list(FIBRE_TYPES)
        elif event_type == "BUILDING_OBSTRUCTION":
            link_types = list(LINE_OF_SIGHT_TYPES)
        elif event_type in ("LINK_CONGESTION", "PACKET_LOSS_SPIKE", "LATENCY_SPIKE"):
            link_types = [self.rng.choice(["RADIO", "MMWAVE", "MICROWAVE", "FIBRE"])]
        message = f"{event_type.replace('_', ' ').title()} near {zone['id']}."
        self._remember(zone["id"])
        return self._incident(
            event_type, "ZONE", zone["id"], severity, message,
            affected_link_types=link_types, visual_zone=zone)

    def _recovery(self):
        target_id = self.rng.choice(self._recent_targets)
        return self._incident(
            RECOVERY_TYPE, "ZONE", target_id, 0.0,
            f"Conditions at {target_id} are recovering.")

    def _remember(self, target_id):
        if target_id not in self._recent_targets:
            self._recent_targets.append(target_id)
        # keep the memory small
        self._recent_targets = self._recent_targets[-6:]
