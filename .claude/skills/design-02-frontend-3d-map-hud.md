# Packet Quest Arena — Frontend 3D Map, Camera, HUD, State, and Interactions

**Use this file when working on:** React/Three.js or React Three Fiber implementation, isometric city map, planet view, HUD panels, frontend state, interactions, performance, and accessibility.

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
