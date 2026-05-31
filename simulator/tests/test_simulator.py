from simulator.topology import generate_topology
from simulator import simulator


def test_topology_node_count():
    topo = generate_topology(node_count=4)
    assert len(topo["nodes"]) == 4


def test_topology_links_connect_nodes():
    topo = generate_topology(node_count=4)
    assert len(topo["links"]) == 3


def test_topology_is_repeatable():
    assert generate_topology(seed=42) == generate_topology(seed=42)


def test_topology_is_connected():
    # Every node must be reachable from node 0 over the (undirected) link graph.
    topo = generate_topology(node_count=6, seed=3)
    adj = {n["id"]: set() for n in topo["nodes"]}
    for link in topo["links"]:
        adj[link["source"]].add(link["target"])
        adj[link["target"]].add(link["source"])
    seen, stack = set(), [topo["nodes"][0]["id"]]
    while stack:
        node = stack.pop()
        if node in seen:
            continue
        seen.add(node)
        stack.extend(adj[node] - seen)
    assert seen == {n["id"] for n in topo["nodes"]}


def test_run_emits_requested_count_in_print_mode():
    # No SESSION_ID -> print-only; a stub sleep keeps the test instant.
    emitted = []
    original = simulator.SESSION_ID
    simulator.SESSION_ID = None
    try:
        simulator.run(count=3, seed=7, sleep=lambda s: emitted.append(s))
    finally:
        simulator.SESSION_ID = original
    # 3 incidents -> 2 inter-incident sleeps
    assert len(emitted) == 2
