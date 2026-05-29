# Packet Quest Arena — Overview, Scope, and Architecture

**Use this file when working on:** overall project understanding, MVP scope, final vision, architecture, game flow, and game modes.

---

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
