# Packet Quest Arena — Game Logic, Topology, Packets, Scoring, Weather, and Satellites

**Use this file when working on:** game rules, topology, packet types, scoring, route validation, weather/incidents, and satellite node behaviour.

---

## 9. Network Topology Design

The network map should use a simplified 5G/O-RAN-style topology.

### 9.1 Node Types

| Node Type | Description | 3D Visual |
|---|---|---|
| `O_RU` | Radio unit / radio tower | mast/tower on rooftop or ground |
| `SMALL_CELL` | Small cell on building | small antenna on building |
| `O_DU` | Distributed unit | small equipment cabinet/facility |
| `O_CU` | Central unit | larger equipment building |
| `EDGE` | Edge compute node | compact data centre block |
| `UPF` | User plane function | network hub building |
| `CORE` | Core data centre | large data centre |
| `SATELLITE` | Fixed satellite network node | satellite in planet view or high orbit view |

### 9.2 Node Status

| Status | Meaning | Visual |
|---|---|---|
| `HEALTHY` | Normal | steady glow |
| `DEGRADED` | Slower or riskier | amber pulse |
| `FAILED` | Cannot be used | red/dark object |

### 9.3 Link Types

| Link Type | Strength | Weakness | Visual |
|---|---|---|---|
| `RADIO` | flexible and fast | weather/interference/obstruction | blue translucent beam |
| `MMWAVE` | very fast, high capacity | rain/building/line-of-sight sensitive | thin bright beam |
| `MICROWAVE` | good backhaul | storm and line-of-sight sensitive | arced beam between towers |
| `FIBRE` | stable and fast | construction/fibre cuts | ground cable line |
| `LEGACY` | backup path | low capacity, high latency | grey dull line |
| `SATELLITE` | wide-area backup path | high latency, weather sensitive | orbital line/beam |

### 9.4 Link Status

| Status | Rule | Visual |
|---|---|---|
| `HEALTHY` | utilisation below 60% | stable green/blue |
| `BUSY` | 60% to 85% | thicker animated pulse |
| `CONGESTED` | 85% to 100% | amber pulse |
| `OVERLOADED` | above 100% | rapid red pulse |
| `FAILED` | unusable | broken red dashed line |

---

## 10. Packet Types

| Packet Type | Value | Deadline | Load | Gameplay Meaning |
|---|---:|---:|---:|---|
| `EMERGENCY` | 150 | very short | 8 | high value, must be fast |
| `CONTROL` | 120 | short | 6 | reliability matters |
| `VIDEO` | 90 | medium | 20 | high bandwidth |
| `IOT` | 70 | longer | 4 | low load, avoids loss |
| `BACKGROUND` | 40 | longest | 12 | lower priority |

Packet jobs should be generated per player. Players should always have a few available jobs so they are not waiting with nothing to do.

---

## 11. Scoring Design

The backend calculates all scores.

Recommended formula:

```text
score =
  packetValue
  + speedBonus
  - routeCost
  - congestionPenalty
  - packetLossPenalty
```

Dropped or expired packet:

```text
score = -dropPenalty
```

### 11.1 Score Factors

| Factor | Purpose |
|---|---|
| packet value | rewards important traffic |
| speed bonus | rewards fast delivery |
| route cost | discourages unnecessarily long routes |
| congestion penalty | discourages overusing busy links |
| packet loss penalty | discourages risky routes |
| drop penalty | punishes failed delivery |

### 11.2 Suggested Drop Penalties

| Packet Type | Drop Penalty |
|---|---:|
| `EMERGENCY` | -100 |
| `CONTROL` | -80 |
| `VIDEO` | -60 |
| `IOT` | -40 |
| `BACKGROUND` | -20 |

---

## 12. Route Validation Rules

When a player submits a route, the frontend should submit only:

```json
{
  "playerId": "player-1",
  "packetFlowId": "packet-123",
  "path": ["node-a", "node-b", "node-c"]
}
```

The backend must reject invalid routes.

### 12.1 Backend Validation

Reject a route if:

- session is not active
- packet does not exist
- packet is not owned by the player
- packet is not pending
- path does not start at packet source
- path does not end at packet destination
- any adjacent nodes in path are not connected
- any node in the route is failed
- any link in the route is failed
- packet deadline already expired
- route result is too slow for the packet SLA
- packet loss roll fails
- the game timer has ended

The frontend must never send:

- score
- delivery result
- latency result
- link load result
- packet status result

Those are calculated by backend rules only.

---

## 13. Weather and Incident Design

Weather and incidents should be visible on the map but should not hide gameplay information.

### 13.1 Weather Conditions

Weather should be area-based. Different areas of the city map can have different weather.

Weather types:

| Weather | Effect | Affected Links |
|---|---|---|
| `CLEAR` | no penalty | none |
| `SUNNY` | no penalty, visually clear | none |
| `ELECTRICAL_STORM` | latency increase, packet loss risk | radio, mmWave, microwave, satellite |
| `HIGH_WINDS` | tower instability, latency/risk | radio, microwave |
| `FOG_OR_INTERFERENCE` | signal clarity penalty | radio, mmWave |
| `HEAVY_RAIN` | mmWave/radio degradation | mmWave, radio, microwave |

### 13.2 Non-Weather Incidents

Construction and other incidents should be separate from weather.

Incident types:

| Incident | Effect | Affected Elements |
|---|---|---|
| `CONSTRUCTION` | fibre risk, reroute pressure | fibre links and roads |
| `FIBRE_CUT` | link failure | fibre links |
| `NODE_FAILURE` | node unusable | selected node |
| `NODE_DEGRADED` | latency multiplier | selected node |
| `LINK_FAILURE` | link unusable | selected link |
| `LINK_CONGESTION` | load spike | selected link |
| `PACKET_LOSS_SPIKE` | packet loss risk | selected link/node |
| `LATENCY_SPIKE` | latency increase | selected link/node |
| `POWER_OUTAGE` | node degradation/failure | district or node |
| `RECOVERY` | clears previous incident | affected object |

### 13.3 Weather Zone Visuals

Weather zones should appear as light overlays:

- electrical storm: dark cloud with lightning highlights
- high winds: moving wind streaks
- sunny/clear: no overlay or subtle safe-zone glow
- fog/interference: translucent shimmer
- heavy rain: subtle rain particles

Weather should not obscure nodes, routes, link labels, or packets.

### 13.4 Incident Zone Visuals

Construction and incidents should have separate visuals:

- construction zone: roadworks icon/striped ground overlay
- fibre cut: broken cable icon
- power outage: dimmed district
- node failure: red pulse on node
- link failure: broken/dashed red line
- packet loss spike: warning shimmer on link
- latency spike: clock/slowdown icon

### 13.5 Tooltip for Weather/Incident Areas

When hovering over a weather or incident zone, show:

```text
Condition: Electrical Storm
Affected area: East District
Affected link types: RADIO, MMWAVE, MICROWAVE
Latency impact: +25ms
Packet loss risk: Medium
Time remaining: 18s
Recommended action: Avoid wireless routes if possible
```

---

## 14. Satellite Design

For MVP, satellites are visual and route-capable fixed nodes. Players cannot deploy new satellites yet.

### 14.1 MVP Satellite Behaviour

- Satellites appear clearly in planet view.
- Satellites can appear as fixed special nodes in the topology.
- Satellite links can connect distant parts of the map.
- Satellite links are high latency but useful as backup routes.
- Satellite links are affected by electrical storms, but less than radio/mmWave.
- Satellite links are not a default best route because they have higher latency and route cost.

### 14.2 Satellite Visuals

In city view:

- satellite connection may appear as a high arced beam going upward
- optional small orbital icon above the city

In planet view:

- show Earth/planet
- show satellites orbiting
- show curved lines between satellites and ground stations
- show active packet routes as animated pulses

### 14.3 Future Satellite Deployment

Future product can allow each player to deploy temporary emergency satellite relays with:

- 3 charges per match
- cooldown
- score cost
- temporary link duration
- backend validation
- weather sensitivity
- expiration timer

This is not required for MVP unless the team has time.

---
