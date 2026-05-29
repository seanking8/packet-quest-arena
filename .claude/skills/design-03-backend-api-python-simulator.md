# Packet Quest Arena — Backend APIs and Python Simulator

**Use this file when working on:** Spring Boot API design, game state endpoints, route submission, WebSocket updates, and Python simulator behaviour.

---

## 19. Backend API Design

### 19.1 Session APIs

```text
POST /api/sessions
POST /api/sessions/{sessionId}/join
POST /api/sessions/{sessionId}/start
GET  /api/sessions/{sessionId}/state
POST /api/sessions/{sessionId}/end
```

### 19.2 Action APIs

```text
POST /api/sessions/{sessionId}/actions/route
POST /api/sessions/{sessionId}/actions/tick
```

Route request:

```json
{
  "playerId": "player-1",
  "packetFlowId": "packet-123",
  "path": ["node-a", "node-b", "node-c"]
}
```

Route response:

```json
{
  "message": "Packet delivered.",
  "packetStatus": "DELIVERED",
  "latencyMs": 84,
  "scoreDelta": 122,
  "state": {}
}
```

### 19.3 Route Preview API

Optional but useful:

```text
POST /api/sessions/{sessionId}/routes/preview
```

Request:

```json
{
  "playerId": "player-1",
  "packetFlowId": "packet-123",
  "path": ["node-a", "node-b", "node-c"]
}
```

Response:

```json
{
  "valid": true,
  "estimatedLatencyMs": 92,
  "packetLossRisk": "MEDIUM",
  "warnings": [
    "Route uses a congested microwave link.",
    "Electrical storm affects part of this route."
  ],
  "estimatedScoreRange": {
    "min": 70,
    "max": 125
  }
}
```

### 19.4 WebSocket API

```text
/ws/sessions/{sessionId}
```

Broadcast events:

```text
SESSION_STATE_UPDATED
PACKET_DELIVERED
PACKET_DROPPED
LINK_STATUS_CHANGED
NODE_STATUS_CHANGED
INCIDENT_CREATED
INCIDENT_RECOVERED
WEATHER_CHANGED
MATCH_COMPLETED
```

---

## 20. Python Simulator Design

The Python simulator should generate events for the backend to apply.

### 20.1 Simulator Responsibilities

- generate random but controlled incidents
- generate weather zones
- generate traffic surges
- suggest link load changes
- simulate recovery events
- support deterministic test mode with seed values

### 20.2 Example Event

```json
{
  "eventType": "ELECTRICAL_STORM",
  "targetType": "AREA",
  "targetId": "east-district",
  "severity": 0.6,
  "durationSeconds": 25,
  "message": "Electrical storm affecting wireless links in East District.",
  "effects": {
    "affectedLinkTypes": ["RADIO", "MMWAVE", "MICROWAVE", "SATELLITE"],
    "latencyPenaltyMs": 25,
    "packetLossIncrease": 0.08
  }
}
```

### 20.3 Incident Timing

Recommended rules:

- one incident every 10 to 20 seconds
- incident duration between 15 and 45 seconds
- not all incidents should be severe
- recovery events should clear old incidents
- avoid constant chaos so players can understand the game

---
