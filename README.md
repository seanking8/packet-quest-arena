# Packet Quest Arena

Packet Quest Arena is a browser-based multiplayer game where players route packet
flows through a simulated 5G-style network. The Spring Boot backend owns game
truth: sessions, topology, packet jobs, routing validation, link load, packet
delivery/drop, scoring, incidents, and the match timer.

## Architecture

- **Frontend**: React + Vite + React Three Fiber for the city map, HUD, and route controls.
- **Backend**: Java 21 + Spring Boot for REST APIs, WebSocket broadcasts, game rules, and scoring.
- **Simulator**: Python CLI chaos engine that generates weather and network incidents.
- **State**: In-memory game sessions for the MVP. MySQL is present for deployment shape, not gameplay persistence yet.
- **Infra**: Docker Compose for local runs and Kubernetes manifests under `k8s/`.

## Quick Start With Docker

```bash
docker compose up --build
```

- Frontend: http://localhost:3000
- Backend API: http://localhost:8080

Create a session in the browser, join with 2-4 players, then start the match.
Active sessions tick automatically on the backend. The manual endpoint still
exists for demos/tests:

```bash
curl -X POST http://localhost:8080/api/sessions/<sessionId>/tick
```

## Running The Simulator Against A Session

The simulator needs a real session id before it can post incidents. Without
`SESSION_ID`, it prints incidents only.

```bash
# host/local Python
cd simulator
SESSION_ID=<sessionId> BACKEND_URL=http://localhost:8080 python simulator.py

# Docker Compose service
SESSION_ID=<sessionId> docker compose up simulator
```

## Running Tests

```bash
# Backend
cd backend && mvn test

# Frontend
cd frontend && npm test

# Simulator
python -m pytest simulator/tests -q
```

## Project Structure

```text
backend/        Spring Boot API and game engine
frontend/       React app and 3D map
simulator/      Python chaos engine
k8s/            Kubernetes manifests
Docs/           Project PDFs and assessment material
docker-compose.yml
```

## Current MVP Notes

- Game state is in memory, so sessions disappear when the backend restarts.
- Backend scheduled ticks keep active matches moving.
- WebSocket updates are broadcast-only; all player actions still go through REST.
- Satellites are fixed route-capable topology nodes; player-deployed satellites are future work.
