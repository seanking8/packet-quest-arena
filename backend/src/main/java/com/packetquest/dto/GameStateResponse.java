package com.packetquest.dto;

import java.util.List;

/**
 * Stable response structure for GET /api/sessions/{id}/state.
 *
 * Uses lightweight view objects (not JPA entities) so the response exposes only
 * the fields the client needs and never serializes entity back-references such
 * as the session object. Fields are present even when empty so the contract
 * stays stable as later stories add data:
 *   - flows : populated by the "Generate packet traffic" story (currently empty)
 *   - score : populated by the "Calculate player score" story (currently 0)
 */
public class GameStateResponse {

    private final String sessionId;
    private final String status;
    private final List<PlayerView> players;
    private final List<NodeView> nodes;
    private final List<LinkView> links;
    private final List<Object> flows;
    private final int score;

    public GameStateResponse(String sessionId, String status,
                             List<PlayerView> players,
                             List<NodeView> nodes, List<LinkView> links,
                             List<Object> flows, int score) {
        this.sessionId = sessionId;
        this.status = status;
        this.players = players;
        this.nodes = nodes;
        this.links = links;
        this.flows = flows;
        this.score = score;
    }

    public String getSessionId() { return sessionId; }
    public String getStatus() { return status; }
    public List<PlayerView> getPlayers() { return players; }
    public List<NodeView> getNodes() { return nodes; }
    public List<LinkView> getLinks() { return links; }
    public List<Object> getFlows() { return flows; }
    public int getScore() { return score; }

    public static class PlayerView {
        private final Long id;
        private final String name;
        public PlayerView(Long id, String name) { this.id = id; this.name = name; }
        public Long getId() { return id; }
        public String getName() { return name; }
    }

    public static class NodeView {
        private final Long id;
        private final String name;
        private final int x;
        private final int y;
        public NodeView(Long id, String name, int x, int y) {
            this.id = id; this.name = name; this.x = x; this.y = y;
        }
        public Long getId() { return id; }
        public String getName() { return name; }
        public int getX() { return x; }
        public int getY() { return y; }
    }

    public static class LinkView {
        private final Long id;
        private final Long source;
        private final Long target;
        private final int capacity;
        private final int latency;
        private final int load;
        private final String status;
        public LinkView(Long id, Long source, Long target,
                        int capacity, int latency, int load, String status) {
            this.id = id; this.source = source; this.target = target;
            this.capacity = capacity; this.latency = latency;
            this.load = load; this.status = status;
        }
        public Long getId() { return id; }
        public Long getSource() { return source; }
        public Long getTarget() { return target; }
        public int getCapacity() { return capacity; }
        public int getLatency() { return latency; }
        public int getLoad() { return load; }
        public String getStatus() { return status; }
    }
}