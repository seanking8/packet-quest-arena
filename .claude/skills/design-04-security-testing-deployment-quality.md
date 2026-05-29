# Packet Quest Arena — Security, Scalability, Testing, Deployment, Quality, and AI Log

**Use this file when working on:** security rules, scalability notes, automated testing, Docker/Kubernetes deployment, SonarQube, and AI usage log.

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
