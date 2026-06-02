# Architecture Summary

Packet Quest Arena is a real-time, multiplayer browser game where players route
network packets across a topology, racing to deliver them before their SLA
expires. This document gives a high-level view of the system.

## Components

| Component | Tech | Responsibility |
|---|---|---|
| **Frontend** | React + Vite, react-three-fiber | Renders the map(s) and HUD, captures player actions (pick job, build route, submit), shows live state. Renders only — it never decides outcomes. |
| **Backend** | Spring Boot (Java 21) | Single source of truth. Owns topology, sessions, scoring, validation, the match/round lifecycle, incident effects, and the real-time broadcast. Exposes REST + WebSocket. |
| **Simulator** | Python | Optional external incident generator that POSTs weather/incidents to a session. The backend also generates incidents itself, so the simulator is not required. |
| **MySQL** | MySQL 8 | Provisioned for persistence; live gameplay state is currently kept in memory (see scalability notes). |

## Responsibilities (backend is authoritative)

- The client **requests** actions; the backend **decides** results. Scores,
  latency, loss, delivery and link load are computed server-side
  (`RoutingService`, `ScoreCalculator`) and never accepted from the client.
- Validation and anti-cheat (packet ownership, session-active, connectivity,
  broken-link rejection) live in the backend (`RoutingService`,
  `IncidentService`). See `docs/security-notes.md`.

## Data flow (routing a packet)

1. Backend generates a session topology + packet jobs (`TopologyGeneratorService`,
   `PacketFlowGenerationService`).
2. Frontend renders nodes/links and the player's jobs.
3. Player picks a job and clicks connected nodes to build a path; the frontend
   sends `POST /api/sessions/{id}/actions/route` with `{playerId, packetFlowId, path}`.
4. Backend validates the path, computes latency/loss/score vs. the traffic
   profile's SLA, updates link load and the player's score, and returns the
   result.
5. Backend broadcasts the new `GameStateDto` to all players over WebSocket.

## Game loop

- A match is **3 rounds** of rising difficulty (calm → congestion → storm),
  90s each, host-advanced between rounds; scores accumulate and the highest
  total wins.
- A scheduled `GameTickService` (~1s) advances every ACTIVE session: decays
  link load, expires overdue packets, tops up jobs, rolls round-appropriate
  incidents/weather, and ends the round (→ intermission) or the match.
- Round difficulty/intensity comes from the host-chosen difficulty × a
  per-round multiplier (`RoundConfig`).

## Real-time update flow

```
player action / scheduled tick / incident
        │
        ▼
  Backend mutates session state (authoritative)
        │
        ▼
  GameStateDto snapshot ──► WebSocket /ws/game/{sessionId} ──► all clients
        │                                   ▲
        └─ fallback: clients without a socket poll GET /state (~1.5s)
```

The frontend's `useGameState` hook prefers the WebSocket and falls back to
polling; either way the client only renders what the backend sends.

## Maps

Two visual families share one backend topology; the host picks one at match
start (stored on the session, broadcast to all players):

- **City** — realistic 3D city (`NetworkScene`) + a daytime 2D plan (`CityMap2D`).
- **District** — strategic 3D district view (`DistrictScene`) + a tactical 2D
  view (`TacticalMap`).

## Where to look in the code

- Lifecycle/scoring: `backend/.../service/{GameService,GameTickService,RoutingService,ScoreCalculator}.java`
- Topology/rounds/weather: `TopologyGeneratorService`, `config/RoundConfig`, `WeatherGenerationService`
- Real-time: `backend/.../websocket/*`, frontend `hooks/useGameState.js`
- Maps/HUD: `frontend/src/components/map/*`, `frontend/src/components/hud/*`
