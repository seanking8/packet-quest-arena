# Packet Quest Arena — Split Design Pack

These files split the original `design.md` into focused parts so Claude, Codex, Kiro, or a teammate can work on one area without reading the full document. Each file starts with a short usage guide.

## File Map

| File | Agent / team focus | Sections included |
|---|---|---|
| `design-00-overview-scope-architecture.md` | Product owner, architect, Kiro planning | 1–8 |
| `design-01-game-logic-topology-scoring.md` | Game rules, scoring, topology, incidents | 9–14 |
| `design-02-frontend-3d-map-hud.md` | React, Three.js, HUD, camera, UI interactions | 15–18, 21–23 |
| `design-03-backend-api-python-simulator.md` | Spring Boot APIs, WebSocket, Python simulator | 19–20 |
| `design-04-security-testing-deployment-quality.md` | Security, scalability, tests, Docker, Kubernetes, quality | 24–29 |
| `design-05-agent-handoff-structure-acceptance.md` | Copy-paste agent prompts, project structure, acceptance criteria | 30–34 |

## Suggested Agent Usage

- Give `design-00` first when an agent needs the overall project context.
- Give `design-02` to the frontend agent working on React/Three.js.
- Give `design-03` to the backend/API/simulator agent.
- Give `design-01` to anyone implementing rules, scoring, routing, incidents, or topology.
- Give `design-04` before asking for tests, Kubernetes, Docker, security, or SonarQube work.
- Give `design-05` when prompting Claude, Codex, or Kiro to generate tasks or code.

## Important Rule

The backend remains authoritative for game state, scoring, validation, packet delivery/drop decisions, and link/node status. The frontend should visualise and submit player choices, not decide outcomes.
