# Packet Quest Arena — Design Document

## 1. Purpose

Packet Quest Arena is a browser-based multiplayer networking game where players route packets across a simulated 5G-style network while dealing with congestion, latency, degraded nodes, failed links, weather conditions, construction incidents, and changing traffic demand.

The game should feel like a competitive strategy game, but it should also clearly teach networking concepts such as routing, graph topology, latency, congestion, packet loss, link capacity, node failure, and recovery.

The visual target is a full-screen interactive 3D city/network map with an isometric viewpoint, zoom controls, edge-based HUD elements, and a one-click zoom-out mode to show a planet-level satellite/network view.

This design is intended to guide implementation by tools such as Kiro, Claude, Codex, and team developers.

---

## 2. High-Level Game Concept

Players compete in the same shared network map. Each player receives packet jobs that must be delivered from a source node to a destination node. Players select routes through a graph of network nodes and links. Every route choice affects the shared network because routed packets increase load on the links they use.

As the match progresses, the network becomes more difficult:

- Links become busy, congested, overloaded, or failed.
- Nodes can become degraded or failed.
- Weather affects some wireless links.
- Construction and incidents affect fibre or city infrastructure.
- Packet deadlines become harder to meet.
- Players must adapt routes to avoid risky or overloaded paths.

The MVP should support competitive multiplayer. The final product can support both competitive and cooperative modes.

---

## 3. Core Objectives

The design should achieve these goals:

1. Build a playable browser-based multiplayer packet-routing game.
2. Use a graph-based network topology.
3. Use a Spring Boot backend for game state, validation, scoring, player actions, and APIs.
4. Use a Python simulator for traffic changes, weather effects, congestion, incidents, and topology events.
5. Use React with Three.js or React Three Fiber for an interactive 3D network map.
6. Use WebSocket updates for live game state.
7. Support Docker and Kubernetes deployment.
8. Keep backend rules authoritative so players cannot manipulate scores or packet outcomes from the browser.
9. Provide a polished demo experience with a full-screen city map, edge HUD, route previews, live packet movement, timer, and leaderboard.
10. Include automated tests for backend, frontend, Python simulator, and system flows.

---

## 4. MVP Scope

### 4.1 MVP Features

The MVP should include:

- Competitive mode.
- 2 to 4 players in one game session.
- Shared network topology.
- Player-owned packet jobs.
- Packet route selection.
- Link load and congestion.
- Link and node health.
- Packet delivery, drop, and expiry.
- Backend-calculated scoring.
- Python-generated incidents and weather effects.
- Real-time browser updates.
- React-based frontend.
- Interactive 3D city map.
- Three camera levels:
  - close city/building view
  - isometric city/network overview
  - planet/satellite view
- Edge-based HUD with toggleable panels.
- Basic satellite nodes visible in planet view and usable as fixed long-distance transmission nodes.
- Docker support.
- Kubernetes manifests.
- Automated tests.
- Security notes.
- AI usage log.

### 4.2 Not in MVP

The following should not be required for the first working version:

- Full realistic city simulation.
- Fully destructible buildings.
- Player-deployable satellites.
- Advanced AI route advisor.
- Large-scale production traffic handling.
- Complex authentication.
- Full replay mode.
- Detailed billing/cost simulation.
- Real telecom protocol accuracy.

These can be future enhancements.

---

## 5. Final Product Vision

The final product can extend the MVP with:

- Competitive and cooperative modes.
- Player roles such as Routing Engineer, Capacity Planner, and Incident Responder.
- Deployable emergency satellite relays.
- AI route advisor with confidence levels.
- Slice-aware routing.
- O-RAN-inspired traffic steering.
- SMO policy decisions.
- Prometheus metrics and Grafana dashboards.
- Replay mode.
- Load testing.
- More detailed weather and terrain impacts.
- More advanced animation and VFX.

---

## 6. Recommended Architecture

```text
Browser Client
React + React Three Fiber / Three.js
3D City Map + HUD + WebSocket Client
        |
        | REST APIs for commands
        | WebSocket/SSE for live updates
        v
Spring Boot Packet Game API
Session Controller
Player Controller
Game State Controller
Route Action Controller
WebSocket Broadcaster
        |
        v
Game Engine / Service Layer
Session Service
Topology Service
Routing Service
Scoring Service
Incident Service
Validation Service
        |
        v
Database
Sessions
Players
Nodes
Links
Packet Jobs
Actions
Incidents
Scores
        |
        v
Python Traffic Simulator
Traffic generation
Weather generation
Incident generation
Congestion updates
Topology event suggestions
```

### 6.1 Frontend

Use:

- React
- TypeScript if possible
- React Three Fiber preferred for Three.js integration
- Zustand, Redux Toolkit, or React Context for state management
- CSS modules or Tailwind/Bootstrap for HUD styling
- WebSocket client for live state updates

React Three Fiber is recommended because it fits React better than raw Three.js and makes UI integration easier.

### 6.2 Backend

Use:

- Java
- Spring Boot
- REST APIs
- WebSocket or Server-Sent Events
- Bean Validation
- Structured logging
- JUnit tests
- Persistence layer using PostgreSQL, H2 for local tests, or another simple database

### 6.3 Python Simulator

Use Python for meaningful simulation work:

- traffic load changes
- congestion events
- weather zone generation
- latency spikes
- packet loss spikes
- construction/fibre cut incidents
- node degradation/failure events
- recovery events

The Python simulator should not directly decide player scores. It should publish events or simulation data that the Spring Boot backend applies through controlled game rules.

### 6.4 Database

Use a database to store:

- game sessions
- players
- network topology
- packet jobs
- player actions
- incident history
- scores
- match results
- AI usage log entries if needed

For student/demo purposes, H2 or PostgreSQL is acceptable. PostgreSQL is better for a realistic setup.

---

## 7. Main Game Flow

```text
1. Player creates game session.
2. Other players join using a session code.
3. Game starts when host clicks Start.
4. Backend generates or loads network topology.
5. Backend creates initial packet jobs for each player.
6. Frontend renders full-screen 3D map.
7. Players select packet jobs.
8. Players preview possible routes.
9. Frontend shows estimated latency, risk, and affected links.
10. Player submits route.
11. Backend validates route.
12. Backend calculates delivery/drop result and score.
13. Backend updates link load.
14. Python simulator periodically generates incidents/weather updates.
15. Backend applies incident effects.
16. WebSocket broadcasts updated game state.
17. UI animates packets, link status, weather, incidents, and score changes.
18. Match ends when timer reaches zero.
19. Winner screen appears.
```

---

## 8. Game Modes

### 8.1 MVP Mode: Competitive

Each player has their own packet jobs and score. All players share the same network. Routes chosen by one player can increase load and affect other players.

Competitive goals:

- deliver high-value packets
- avoid drops
- avoid overloaded routes
- beat other players on score
- react quickly to incidents

### 8.2 Future Mode: Cooperative

All players work together to maintain network health and meet traffic targets. The team wins if enough packets are delivered and critical traffic remains protected.

Cooperative goals:

- protect emergency/control traffic
- manage total network congestion
- recover from incidents
- coordinate route choices
- keep packet loss low

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

## 15. 3D Map Design

The map should be the main screen. HUD elements should sit around the edges instead of using large static menus.

### 15.1 Visual Style

Use a stylised isometric city/network board:

- roads
- buildings
- towers
- data centres
- edge nodes
- fibre routes
- wireless beams
- weather areas
- incident markers
- animated packet flows
- player-coloured route highlights

The map does not need to be fully realistic. Every visual object should support gameplay clarity.

### 15.2 Buildings

Most buildings are decorative. A few tall buildings should be special obstruction buildings.

Building categories:

| Building Type | Purpose |
|---|---|
| normal building | city atmosphere |
| tall obstruction building | can affect line-of-sight |
| data centre | network node |
| telecom tower | network node |
| construction building/area | incident location |

### 15.3 Transparent Buildings

Buildings can be semi-transparent when needed so players can see network nodes and links inside or behind them.

Recommended behaviour:

- normal city view: buildings mostly opaque but not too visually heavy
- route selection mode: buildings near selected route become transparent
- node inspection mode: building around selected node becomes transparent
- obstruction incident: obstruction building is highlighted

### 15.4 Nodes Inside Buildings

For nodes inside or attached to buildings:

- show the building shell semi-transparent
- show the node as a glowing object inside/on top
- use labels or icons so players can identify node type
- allow clicking the node even if it is inside a building

---

## 16. Camera Design

The game should support three main camera levels.

### 16.1 Level 1 — Close City View

Purpose:

- inspect individual buildings
- inspect nodes and links
- see packet animations clearly
- understand local incidents

Controls:

- orbit
- pan
- zoom
- click node/link

### 16.2 Level 2 — Isometric City Overview

Purpose:

- default gameplay view
- see most of the network
- compare route choices
- view weather zones
- monitor congestion

This should be the default camera level.

### 16.3 Level 3 — Planet/Satellite View

Purpose:

- one-click zoomed-out strategic view
- show satellites orbiting
- show long-distance satellite links
- show global network feeling
- create a strong demo moment

Recommended implementation:

Use a separate scene or visual mode for planet view. This is cleaner than trying to zoom the same city scene all the way out.

Behaviour:

```text
Click Planet View
→ transition/fade from city scene
→ show planet with satellites and ground links
→ show satellite-capable network routes
→ click City View to return
```

### 16.4 Camera Buttons

Required buttons:

- reset camera
- close view
- city overview
- planet view
- show/hide labels
- show/hide weather
- show/hide incidents

---

## 17. HUD Design

The HUD should be compact and located around the map edges. Panels should be toggleable.

### 17.1 Top Bar

Displays:

- match timer
- session code
- game status
- current network pressure
- active incident count
- connection status

Example:

```text
Packet Quest Arena | Session: PQ-4821 | 03:42 remaining | Network Pressure: High | Incidents: 3
```

### 17.2 Left Panel — Packet Jobs

Displays current player’s packet jobs:

- packet type
- source
- destination
- deadline
- value
- status
- select button

Panel toggle:

```text
Show/Hide Packet Jobs
```

### 17.3 Right Panel — Leaderboard and Incidents

Displays:

- leaderboard
- player scores
- delivered packets
- dropped packets
- active incidents
- selected node/link details

Panel toggle:

```text
Show/Hide Leaderboard
Show/Hide Incidents
```

### 17.4 Bottom Bar — Route Controls

Displays:

- selected packet
- selected route
- estimated latency
- packet loss risk
- expected score range
- warning messages
- submit route button
- reset route button
- camera buttons

Panel toggle:

```text
Show/Hide Route Controls
```

### 17.5 HUD Rules

- HUD must not cover the whole map.
- HUD should be readable on laptop screens.
- Important information should also appear as text, not colour only.
- Players should be able to hide sections for a clean map view.
- The timer and leaderboard should remain easy to find.

---

## 18. Frontend State Model

Example game state consumed by frontend:

```json
{
  "sessionId": "session-123",
  "sessionCode": "PQ-4821",
  "status": "ACTIVE",
  "startedAt": "2026-05-29T10:00:00Z",
  "durationSeconds": 300,
  "remainingSeconds": 214,
  "players": [
    {
      "id": "player-1",
      "displayName": "Raju",
      "score": 260,
      "deliveredPackets": 4,
      "droppedPackets": 1,
      "color": "blue"
    }
  ],
  "nodes": [
    {
      "id": "node-oru-1",
      "label": "O-RU 1",
      "type": "O_RU",
      "status": "HEALTHY",
      "position": { "x": 10, "y": 0, "z": 5 },
      "latencyMultiplier": 1.0,
      "packetLossRate": 0.0
    }
  ],
  "links": [
    {
      "id": "link-oru1-odu1",
      "sourceNodeId": "node-oru-1",
      "targetNodeId": "node-odu-1",
      "linkType": "RADIO",
      "status": "BUSY",
      "capacity": 100,
      "currentLoad": 72,
      "baseLatencyMs": 20,
      "currentLatencyMs": 35,
      "packetLossRate": 0.02
    }
  ],
  "packetJobs": [
    {
      "id": "packet-1",
      "ownerPlayerId": "player-1",
      "trafficType": "EMERGENCY",
      "sourceNodeId": "node-oru-1",
      "destinationNodeId": "node-core-1",
      "packetSize": 8,
      "deadlineSeconds": 5,
      "expiresAt": "2026-05-29T10:01:30Z",
      "status": "PENDING",
      "value": 150
    }
  ],
  "weatherZones": [
    {
      "id": "weather-east-storm",
      "type": "ELECTRICAL_STORM",
      "area": {
        "shape": "CIRCLE",
        "center": { "x": 20, "z": 10 },
        "radius": 12
      },
      "affectedLinkTypes": ["RADIO", "MMWAVE", "MICROWAVE", "SATELLITE"],
      "latencyPenaltyMs": 25,
      "packetLossIncrease": 0.08,
      "expiresAt": "2026-05-29T10:02:00Z"
    }
  ],
  "incidents": [
    {
      "id": "incident-1",
      "eventType": "FIBRE_CUT",
      "targetType": "LINK",
      "targetId": "link-edge-core",
      "severity": 0.8,
      "message": "Fibre cut detected between Edge-1 and Core-1.",
      "expiresAt": "2026-05-29T10:02:10Z"
    }
  ],
  "recentActions": []
}
```

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

## 21. UI Interaction Design

### 21.1 Basic Controls

| Action | Control |
|---|---|
| Orbit camera | mouse drag |
| Pan camera | right mouse drag or shift + drag |
| Zoom | mouse wheel |
| Select node | click node |
| Select link | click link |
| Select packet | click packet job card |
| Preview route | click nodes in sequence or select suggested route |
| Submit route | button |
| Reset camera | button |
| Planet view | button |
| Toggle HUD panels | panel buttons |

### 21.2 Route Selection Flow

```text
1. Player selects a packet job.
2. Source and destination nodes are highlighted.
3. Player clicks nodes to build a path or selects a suggested path.
4. UI previews route.
5. UI shows estimated latency, packet loss risk, and warnings.
6. Player submits route.
7. Backend validates and calculates result.
8. Packet animates along route.
9. Score and network load update.
```

### 21.3 Visual Feedback

| Event | Feedback |
|---|---|
| packet delivered | green/success animation, score gain |
| packet dropped | red failure animation, score penalty |
| route invalid | warning message and invalid path highlight |
| link congested | amber pulse |
| link overloaded | red rapid pulse |
| weather starts | area overlay appears |
| incident starts | incident marker and feed entry |
| match ends | winner screen |

---

## 22. Performance Design

Keep the 3D scene efficient:

- use simple geometry
- reuse materials
- instance repeated buildings
- avoid thousands of unique meshes
- limit particle effects
- keep weather overlays lightweight
- animate only important gameplay objects
- use labels selectively
- test on normal laptops

Recommended frontend rendering strategy:

- city buildings as instanced meshes
- nodes as reusable components
- links as line/curve components
- packets as small animated meshes
- weather zones as transparent planes/volumes
- HUD as normal React HTML overlay

---

## 23. Accessibility and Clarity

The game should not rely on colour alone.

Use:

- labels
- icons
- text panels
- line patterns
- tooltips
- status names
- warnings
- animation speed differences

Examples:

- failed links are red and dashed
- congested links are amber and pulsing
- overloaded links are red, thick, and fast-pulsing
- weather zones include icons and tooltip text
- packet cards show traffic type and deadline in text

---

## 24. Security Design

Minimum security expectations:

- validate all player actions server-side
- reject routes for packets owned by other players
- do not accept score from frontend
- do not accept delivery result from frontend
- do not accept latency result from frontend
- validate session membership
- validate input sizes
- avoid exposing internal stack traces
- avoid hardcoded secrets
- use server-side match timer
- document authorization rules

Authentication can be lightweight for the student project, such as player tokens or session codes.

---

## 25. Scalability Design

The team should explain how the design behaves at:

- 100 players
- 500 nodes
- 2,000 links
- 100 packet flows per minute
- 10 simultaneous sessions

### 25.1 Main Risks

| Risk | Mitigation |
|---|---|
| too many WebSocket updates | send deltas, throttle updates |
| large topology rendering | level-of-detail, instancing |
| route calculation cost | cache graph, use efficient algorithms |
| database overload | avoid saving every animation frame |
| simulator noise | tick-based updates |
| frontend slowdown | reduce particles and labels |

---

## 26. Testing Strategy

### 26.1 Backend Tests

Test:

- session creation
- player join
- match start
- packet generation
- route validation
- route rejection
- score calculation
- congestion thresholds
- link load increase after routing
- packet expiry
- node failure handling
- link failure handling
- route ownership security
- match completion

### 26.2 Frontend Tests

Test:

- game state renders
- packet panel renders
- leaderboard renders
- node/link status indicators render
- route selection works
- action submission works
- HUD toggles work
- camera buttons exist
- error messages display

### 26.3 Python Tests

Test:

- traffic generation
- weather event generation
- construction/fibre cut events
- repeatable simulation with seed
- recovery events
- event JSON format

### 26.4 System Test

At least one automated system test should prove:

```text
1. Create session.
2. Join two players.
3. Start match.
4. Generate traffic.
5. Submit route.
6. Score changes.
7. Network state updates.
8. Match can complete.
```

---

## 27. Deployment Design

### 27.1 Docker

Docker should include:

- Spring Boot backend container
- React frontend container
- Python simulator container if separate
- database container
- docker-compose for local development

### 27.2 Kubernetes

Kubernetes manifests should include:

- deployments
- services
- ConfigMaps
- Secrets if needed
- readiness probes
- liveness probes
- resource requests and limits
- horizontal scaling for at least one service

Recommended services:

```text
packet-frontend
packet-api
packet-simulator
packet-db
```

---

## 28. SonarQube and Code Quality

The project should use SonarQube or SonarCloud.

Quality expectations:

- no blocker issues
- no critical issues
- meaningful unit test coverage
- reviewed security hotspots
- no hardcoded secrets
- low duplication
- maintainable naming and structure
- no unused major logic

The team should document:

- how SonarQube was run
- quality gate result
- issues found
- issues fixed
- issues accepted with justification

---

## 29. AI Usage Log

Because AI tools are being used, maintain an AI usage log.

Each entry should include:

```text
Date:
Tool used:
Prompt summary:
Output used:
Human review performed:
Changes made by team:
Risk or concern:
```

AI can help with:

- explaining graph algorithms
- generating tests
- drafting documentation
- suggesting UI components
- reviewing code structure
- identifying edge cases

AI should not be used blindly for:

- final routing logic
- security rules
- scoring rules
- tests without understanding expected results

---

## 30. Suggested Project Structure

```text
packet-quest-arena/
  frontend/
    src/
      components/
        hud/
        map/
        panels/
      three/
        CityScene.tsx
        PlanetScene.tsx
        Nodes.tsx
        Links.tsx
        WeatherZones.tsx
        PacketAnimations.tsx
      state/
      api/
      tests/
  backend/
    src/main/java/
      controller/
      service/
      domain/
      repository/
      websocket/
      dto/
      validation/
    src/test/java/
  simulator/
    src/
      simulator.py
      events.py
      weather.py
      incidents.py
    tests/
  deployment/
    docker/
    kubernetes/
  docs/
    design.md
    architecture.md
    security-notes.md
    scalability-notes.md
    ai-usage-log.md
```

---

## 31. Implementation Prompts for Claude, Codex, and Kiro

### 31.1 React / Three.js Prompt

```text
Build the Packet Quest Arena frontend using React and React Three Fiber. Create a full-screen 3D isometric city/network map. The map should show nodes, links, buildings, packet animations, weather zones, incident markers, and a HUD around the edges. Implement three camera modes: close city view, isometric overview, and planet/satellite view. HUD panels must be toggleable. Use mock game state first, but design the components to consume backend game state later. Keep the 3D scene performant using simple geometry and reusable components.
```

### 31.2 Spring Boot Backend Prompt

```text
Build the Packet Quest Arena Spring Boot backend. Implement sessions, players, game state, topology, packet jobs, route submission, scoring, congestion, node/link status, and WebSocket state broadcasts. The backend must be authoritative. Do not accept score, latency, delivery result, or link load from the frontend. Add REST APIs for create session, join session, start match, get state, submit route, preview route, tick, and end match. Add tests for route validation, scoring, congestion, packet expiry, invalid actions, and match flow.
```

### 31.3 Python Simulator Prompt

```text
Build the Packet Quest Arena Python simulator. It should generate traffic changes, weather zones, construction incidents, fibre cuts, node degradation, link failures, packet loss spikes, latency spikes, high winds, electrical storms, and recovery events. Events should be JSON objects that the Spring Boot backend can apply. Include deterministic seed support for tests. Add unit tests for event generation and repeatable simulation behaviour.
```

### 31.4 WebSocket Prompt

```text
Add live update support to Packet Quest Arena. The Spring Boot backend should broadcast game state updates to all connected clients in a session whenever packets are routed, scores change, incidents occur, weather changes, nodes or links change status, or the match ends. The React frontend should subscribe to updates and refresh the 3D scene and HUD without page reloads.
```

### 31.5 Testing Prompt

```text
Create automated tests for Packet Quest Arena across backend, frontend, Python simulator, and system flow. Backend tests should cover session create/join/start, packet generation, route validation, scoring, congestion, packet expiry, failed nodes/links, and invalid player actions. Frontend tests should cover rendering the map, packet panel, leaderboard, route controls, HUD toggles, and action submission. Python tests should cover weather and incident event generation. Add one end-to-end flow that creates a session, joins two players, starts the match, submits a route, and verifies score/game state changes.
```

---

## 32. Acceptance Criteria

The design is implemented successfully when:

- browser app opens successfully
- two or more players can join the same session
- game starts and shows timer
- full-screen 3D city map renders
- players can zoom/pan/orbit
- players can switch between close, isometric, and planet views
- nodes and links are visible
- packets are generated
- players can select packet jobs
- players can preview and submit routes
- backend validates actions
- scores are calculated by backend
- link load changes after routing
- congestion appears visually
- weather affects relevant links
- construction/incidents are separate from weather
- satellite nodes appear visually and can be represented as high-latency route nodes
- leaderboard updates
- match ends when timer reaches zero
- winner screen appears
- Docker setup works
- Kubernetes manifests exist
- automated tests run
- SonarQube result is documented
- security and scalability notes exist
- AI usage is logged

---

## 33. Key Design Decisions

| Decision | Reason |
|---|---|
| React + React Three Fiber | Best fit for React-based 3D UI |
| Spring Boot authoritative backend | Prevents cheating and keeps game rules reliable |
| Python simulator | Meets requirement and cleanly separates chaos/event generation |
| WebSocket updates | Supports real-time multiplayer state |
| Edge HUD | Keeps map immersive and avoids chunky menus |
| Three camera levels | Supports close inspection, normal play, and planet/satellite demo view |
| Area-based weather | Makes map conditions understandable |
| Incidents separate from weather | Clearer gameplay and easier testing |
| Satellites route-capable but not deployable in MVP | Good visual impact without too much scope |
| Transparent buildings only when useful | Keeps city readable while supporting node visibility |

---

## 34. Open Questions for Team

The team should decide these before implementation:

1. Use React Three Fiber or raw Three.js?
2. Use PostgreSQL or H2 for MVP?
3. Use WebSocket or Server-Sent Events?
4. Should route preview calculate real backend estimates or frontend-only approximate warnings?
5. How many nodes and links should the demo topology contain?
6. Should planet view be a separate route/scene or a camera mode?
7. How complex should the first weather system be?
8. Should satellite routes be enabled in MVP or visual-only for the first demo?
9. What single command runs all tests?
10. What exact criteria must pass before final demo?

Recommended answers:

- React Three Fiber
- PostgreSQL for realistic local setup, H2 for tests
- WebSocket
- backend route preview
- 15 to 25 nodes for MVP
- separate planet scene
- 3 to 4 weather/incident types initially
- route-capable fixed satellite nodes if time allows
- one script for all tests
- demo checklist based on acceptance criteria above
