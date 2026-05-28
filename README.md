# Packet Quest Arena

A browser-based multiplayer game where players route packets through a simulated 5G network.

## Architecture

- **Frontend**: React (Vite) — game board, topology view, player actions
- **Backend**: Java Spring Boot — REST API, WebSocket, game logic, scoring
- **Simulator**: Python — traffic generation and congestion simulation
- **Database**: MySQL 8
- **Infra**: Docker Compose (local), Kubernetes (deployment)

## Quick Start

```bash
docker compose up --build
```

- Frontend: http://localhost:3000
- Backend API: http://localhost:8080

## Running Tests

```bash
# Backend
cd backend && ./mvnw test

# Frontend
cd frontend && npm test

# Simulator
cd simulator && pytest
```

## Project Structure

```
├── frontend/       React app
├── backend/        Spring Boot API
├── simulator/      Python traffic simulator
├── k8s/            Kubernetes manifests
└── docker-compose.yml
```
