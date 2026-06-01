"""
Weather definitions for the Packet Quest Arena chaos engine.

Weather is area-based and mostly affects wireless link types. It is kept
separate from non-weather incidents (construction, fibre cuts, etc.).
"""

WEATHER_TYPES = [
    "WEATHER_ELECTRICAL_STORM",
    "WEATHER_HIGH_WINDS",
    "WEATHER_CLEAR",
]

# Link types each weather condition affects.
WEATHER_LINK_TYPES = {
    "WEATHER_ELECTRICAL_STORM": ["RADIO", "MMWAVE", "MICROWAVE", "SATELLITE"],
    "WEATHER_HIGH_WINDS": ["RADIO", "MICROWAVE"],
    "WEATHER_CLEAR": [],
}

# Circular zones over districts of the backend city map (x/z ground plane, radius).
ZONES = [
    {"id": "zone-downtown", "x": -10, "z": 25, "radius": 45},
    {"id": "zone-north", "x": -55, "z": 72, "radius": 38},
    {"id": "zone-harbor", "x": 24, "z": -70, "radius": 34},
    {"id": "zone-west", "x": -112, "z": 0, "radius": 38},
    {"id": "zone-airport", "x": 88, "z": 76, "radius": 34},
    {"id": "zone-core", "x": 112, "z": 12, "radius": 40},
    {"id": "zone-south", "x": -42, "z": -72, "radius": 42},
]

WEATHER_MESSAGES = {
    "WEATHER_ELECTRICAL_STORM": "Electrical storm over {zone} is increasing packet loss on wireless links.",
    "WEATHER_HIGH_WINDS": "High winds near {zone} are destabilising radio and microwave links.",
    "WEATHER_CLEAR": "Skies are clearing over {zone}; wireless conditions are improving.",
}


def is_weather(event_type):
    """True if the event type is a weather condition (vs a non-weather incident)."""
    return event_type in WEATHER_TYPES
