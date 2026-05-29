# Packet Quest Arena — Agent Handoff, Project Structure, Acceptance Criteria, and Open Questions

**Use this file when working on:** Claude/Codex/Kiro prompts, project structure, acceptance criteria, final design decisions, and team open questions.

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
