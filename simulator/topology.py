"""Topology helpers shared by simulator tests and incident generation."""
import random


NETWORK_NODES = {
    "ru-north": {"x": -70, "z": 85},
    "ru-south": {"x": -65, "z": -90},
    "ru-east": {"x": 95, "z": 70},
    "ru-west": {"x": -135, "z": 5},
    "oru-central": {"x": -20, "z": 10},
    "sc-plaza": {"x": -35, "z": 48},
    "sc-market": {"x": 5, "z": 58},
    "sc-harbor": {"x": 35, "z": -82},
    "odu-1": {"x": -4, "z": 35},
    "odu-2": {"x": -5, "z": -38},
    "ocu-1": {"x": 42, "z": 8},
    "edge-1": {"x": 76, "z": 45},
    "upf-1": {"x": 86, "z": 0},
    "core-1": {"x": 118, "z": -5},
    "dc-1": {"x": 150, "z": 38},
    "sat-1": {"x": -25, "z": -25},
    "sat-2": {"x": 115, "z": 35},
}

NETWORK_LINKS = [
    {"id": "l-runorth-oru", "source": "ru-north", "target": "oru-central", "type": "RADIO"},
    {"id": "l-rusouth-oru", "source": "ru-south", "target": "oru-central", "type": "RADIO"},
    {"id": "l-ruwest-oru", "source": "ru-west", "target": "oru-central", "type": "RADIO"},
    {"id": "l-rueast-ocu", "source": "ru-east", "target": "ocu-1", "type": "RADIO"},
    {"id": "l-scplaza-oru", "source": "sc-plaza", "target": "oru-central", "type": "MMWAVE"},
    {"id": "l-scplaza-runorth", "source": "sc-plaza", "target": "ru-north", "type": "MMWAVE"},
    {"id": "l-scmarket-ocu", "source": "sc-market", "target": "ocu-1", "type": "MMWAVE"},
    {"id": "l-scharbor-ocu", "source": "sc-harbor", "target": "ocu-1", "type": "MMWAVE"},
    {"id": "l-runorth-rueast", "source": "ru-north", "target": "ru-east", "type": "MICROWAVE"},
    {"id": "l-ruwest-rusouth", "source": "ru-west", "target": "ru-south", "type": "MICROWAVE"},
    {"id": "l-oru-odu1", "source": "oru-central", "target": "odu-1", "type": "FIBRE"},
    {"id": "l-oru-odu2", "source": "oru-central", "target": "odu-2", "type": "FIBRE"},
    {"id": "l-odu1-ocu", "source": "odu-1", "target": "ocu-1", "type": "FIBRE"},
    {"id": "l-odu2-ocu", "source": "odu-2", "target": "ocu-1", "type": "FIBRE"},
    {"id": "l-ocu-edge", "source": "ocu-1", "target": "edge-1", "type": "FIBRE"},
    {"id": "l-ocu-upf", "source": "ocu-1", "target": "upf-1", "type": "FIBRE"},
    {"id": "l-edge-upf", "source": "edge-1", "target": "upf-1", "type": "FIBRE"},
    {"id": "l-upf-core", "source": "upf-1", "target": "core-1", "type": "FIBRE"},
    {"id": "l-core-dc", "source": "core-1", "target": "dc-1", "type": "FIBRE"},
    {"id": "l-runorth-odu1", "source": "ru-north", "target": "odu-1", "type": "LEGACY"},
    {"id": "l-odu1-odu2", "source": "odu-1", "target": "odu-2", "type": "LEGACY"},
    {"id": "l-sat1-rusouth", "source": "sat-1", "target": "ru-south", "type": "SATELLITE"},
    {"id": "l-sat1-core", "source": "sat-1", "target": "core-1", "type": "SATELLITE"},
    {"id": "l-sat2-rueast", "source": "sat-2", "target": "ru-east", "type": "SATELLITE"},
    {"id": "l-sat2-dc", "source": "sat-2", "target": "dc-1", "type": "SATELLITE"},
]


def link_ids_in_zone(zone, link_types=None, fallback_nearest=True):
    """Return backend link ids whose endpoints or midpoint touch a visual zone."""
    types = set(link_types or [])
    candidates = [link for link in NETWORK_LINKS if not types or link["type"] in types]
    matching = [link["id"] for link in candidates if _link_touches_zone(link, zone)]
    if matching or not fallback_nearest or not candidates:
        return matching
    nearest = min(candidates, key=lambda link: _link_distance_to_zone_center(link, zone))
    return [nearest["id"]]


def _link_touches_zone(link, zone):
    radius = max(0, zone.get("radius", 0)) + 4
    source = NETWORK_NODES[link["source"]]
    target = NETWORK_NODES[link["target"]]
    midpoint = {
        "x": (source["x"] + target["x"]) / 2,
        "z": (source["z"] + target["z"]) / 2,
    }
    return any(_point_in_zone(point, zone, radius) for point in (source, target, midpoint))


def _point_in_zone(point, zone, radius):
    dx = point["x"] - zone["x"]
    dz = point["z"] - zone["z"]
    return (dx * dx + dz * dz) ** 0.5 <= radius


def _link_distance_to_zone_center(link, zone):
    source = NETWORK_NODES[link["source"]]
    target = NETWORK_NODES[link["target"]]
    mid_x = (source["x"] + target["x"]) / 2
    mid_z = (source["z"] + target["z"]) / 2
    dx = mid_x - zone["x"]
    dz = mid_z - zone["z"]
    return (dx * dx + dz * dz) ** 0.5


def generate_topology(node_count=6, seed=None):
    rng = random.Random(seed)
    nodes = [{"id": i, "name": f"Node-{i}", "x": rng.randint(50, 750), "y": rng.randint(50, 450)}
             for i in range(node_count)]
    links = []
    for i in range(node_count - 1):
        links.append({
            "source": i,
            "target": i + 1,
            "capacity": rng.randint(50, 200),
            "latency": rng.randint(1, 20),
            "load": 0,
        })
    return {"nodes": nodes, "links": links}
