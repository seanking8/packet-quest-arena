"""
Generates a simple network topology for a game session.
"""
import random


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
