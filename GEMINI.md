# Packet Quest Arena - Project Instructions

## 1. Project Identity & Architecture
**Packet Quest Arena** is a multiplayer networking strategy game.
- **Backend (Authoritative):** Java 21 / Spring Boot 3.2.5. Handles all game logic, scoring, and session management.
- **Frontend:** React 18 / Vite / React Three Fiber. Interactive 3D network map with an edge-based HUD.
- **Simulator:** Python. Generates network incidents, weather effects, and traffic congestion.
- **Communication:** REST for actions; WebSockets for real-time game state broadcasts.

## 2. Core Mandates
- **Authoritative Backend:** Never implement scoring, packet delivery logic, or link/node status decisions on the frontend. The frontend is for visualization and submission only.
- **Performance:** Keep the 3D scene performant. Use simple geometry and reusable components in React Three Fiber.
- **Testing:** Every change must be verified. Use the `scripts/test-all.sh` to run the full suite.

## 3. Technology Stack & Tools
### Backend (`/backend`)
- **Build:** Maven (`mvn`)
- **Tests:** JUnit 5, Mockito, JaCoCo for coverage.
- **Persistence:** JPA/Hibernate with MySQL (runtime) and H2 (test).
- **Format:** Follow standard Java/Spring Boot conventions.

### Frontend (`/frontend`)
- **Build/Dev:** Vite
- **3D Engine:** Three.js via `@react-three/fiber` and `@react-three/drei`.
- **UI:** React Flow for node/link logic if applicable, custom CSS for HUD.
- **Tests:** Vitest, React Testing Library.

### Simulator (`/simulator`)
- **Engine:** Python
- **Tests:** Pytest
- **Events:** Produces JSON-based events (incidents, weather) for the backend to consume.

## 4. Workflows & Commands
- **Run all tests:** `./scripts/test-all.sh`
- **Backend build:** `cd backend && mvn clean install`
- **Frontend dev:** `cd frontend && npm run dev`
- **Simulator tests:** `python3 -m pytest simulator/tests`

## 5. Development Guidelines
- **Surgical Edits:** Prefer targeted changes to existing files.
- **Validation:** Always run relevant tests before concluding a task.
- **Security:** Adhere to the authoritative backend model. Validate all player actions server-side.
- **Quality:** Maintain high test coverage (monitored via JaCoCo/SonarQube). No blocker or critical issues in SonarQube.
- **Documentation:** Keep `Docs/` updated with significant architectural changes.
- **AI Logs:** Log significant AI-driven changes in `AI_USAGE_LOG.md` following the format in `.claude/skills/design-04-security-testing-deployment-quality.md`.

## 6. Directory Structure
- `backend/`: Spring Boot application.
- `frontend/`: React application.
- `simulator/`: Python traffic/incident simulator.
- `k8s/`: Kubernetes manifests.
- `scripts/`: Utility scripts (e.g., test runners).
- `Docs/`: Project documentation and PDFs.
- `.claude/`: Design documents and agent skills (Legacy context).
- `AI_USAGE_LOG.md`: Log of AI tool usage and contributions.
