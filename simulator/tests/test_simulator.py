from simulator.topology import generate_topology
from simulator.simulator import generate_event


def test_topology_node_count():
    topo = generate_topology(node_count=4)
    assert len(topo["nodes"]) == 4


def test_topology_links_connect_nodes():
    topo = generate_topology(node_count=4)
    assert len(topo["links"]) == 3


def test_topology_is_repeatable():
    assert generate_topology(seed=42) == generate_topology(seed=42)


def test_generate_event_has_required_fields():
    event = generate_event()
    assert "type" in event
    assert "linkId" in event
    assert "load" in event
