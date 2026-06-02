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
cp .env.example .env          # local dev defaults (no real secrets)
docker compose up --build
```

Services and default host ports:

| Service   | URL / Port                | Notes                                  |
|-----------|---------------------------|----------------------------------------|
| Frontend  | http://localhost:3000     | nginx serving the built React app      |
| Backend   | http://localhost:8080     | Spring Boot API (has a healthcheck)    |
| MySQL     | localhost:3307 → 3306     | 3307 avoids clashing with a local MySQL|
| Simulator | (no port)                 | optional incident generator, opt-in    |

Ports and credentials are read from `.env` (see `.env.example`); override any
of them there. The backend waits for MySQL to be healthy, and the simulator
waits for the backend to be healthy, so `docker compose up` starts cleanly.

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

## Deploying To Kubernetes

Manifests live in `k8s/` (Deployments, Services, ConfigMap, placeholder Secret,
probes, resource limits, and a backend CPU HPA). Quick version:

```bash
# build images the cluster can see (Minikube example)
eval $(minikube docker-env)
docker build -t packetquest/backend:latest ./backend
docker build -t packetquest/frontend:latest ./frontend
docker build -t packetquest/simulator:latest ./simulator

kubectl apply -f k8s/namespace.yaml
kubectl apply -n packetquest -f k8s/
kubectl get pods,svc,hpa -n packetquest
kubectl port-forward -n packetquest svc/frontend 3000:80
```

Full instructions (secret setup, apply order, checks, cleanup) are in
[`k8s/README.md`](k8s/README.md).

## Running Tests

```bash
# Everything at once (backend + frontend + simulator)
./scripts/test-all.sh

# Or run each suite individually:

# Backend (JUnit / Spring — includes the full-match system flow test)
cd backend && mvn test

# Frontend (Vitest)
cd frontend && npm test

# Simulator (pytest)
python3 -m pytest simulator/tests -q
```

The backend suite includes `FullMatchFlowTest`, an end-to-end system test that
drives create session → join two players → start → generate traffic → submit a
route over the real topology → assert the packet status and score change.

## Documentation

- [Architecture summary](Docs/design/architecture-summary.md) — components, data flow, game loop, real-time updates
- [Security & anti-cheat notes](Docs/security-notes.md) — backend-authoritative design, validation, no secrets
- [Scalability notes](Docs/scalability-notes.md) — behaviour and mitigations under load
- [AI usage log](AI_USAGE_LOG.md) — honest record of AI-assisted contributions

## Code Quality (SonarQube)

`sonar-project.properties` configures sources, tests, coverage report paths and
exclusions (`node_modules`, `target`, `dist`, `build`, coverage, `__pycache__`).
Coverage reports must be generated before a scan:

Generate the three coverage reports from the **repo root**:

```bash
# Frontend (Vitest) -> frontend/coverage/lcov.info
cd frontend && npm run coverage && cd ..

# Backend (JaCoCo) -> backend/target/site/jacoco/{jacoco.xml,index.html}
cd backend && mvn test && cd ..

# Simulator (pytest-cov) -> simulator/coverage.xml  (run from repo root so the
# `simulator` package imports resolve)
pip install -r simulator/requirements.txt
python3 -m pytest simulator/tests --cov=simulator \
  --cov-report=xml:simulator/coverage.xml --cov-report=term
```

Then run a scan against your SonarQube/SonarCloud server:

```bash
sonar-scanner -Dsonar.host.url=<url> -Dsonar.login=<token>
```

**Viewing JaCoCo locally** (no Sonar needed): open
`backend/target/site/jacoco/index.html` in a browser for the line/branch
coverage report.

Latest locally-measured coverage (regenerate to confirm):

| Suite | Tests | Coverage |
|---|---|---|
| Backend (JaCoCo) | 112 pass | ~82% instructions, ~82% lines, ~64% branches |
| Simulator (pytest-cov) | 18 pass | ~98% lines |
| Frontend (Vitest) | 26 pass | run `npm run coverage` to measure |

A real local SonarQube scan has been run — **Quality Gate: PASSED** (8 bugs,
0 vulnerabilities, ~36% overall coverage, dragged down by unmeasured frontend).
Full results and how to reproduce them are in
[`Docs/quality-gate-notes.md`](Docs/quality-gate-notes.md).

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
