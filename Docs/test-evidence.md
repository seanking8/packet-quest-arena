# Test Evidence

Last verified on 2026-06-03.

| Area | Command | Result |
| --- | --- | --- |
| Backend | `cd backend && mvn test` | 115 tests passed, 0 failures, 0 errors |
| Frontend | `cd frontend && cmd.exe /c npx vitest run --cache=false` | 8 files passed, 31 tests passed |
| Simulator | `python -m pytest simulator/tests -q` | 18 tests passed |
| Frontend build | `cd frontend && npm.cmd run build` | Production build succeeded; Vite large chunk warning only |
| Docker Compose | `docker compose up --build -d` | Full stack rebuilt and started; backend and MySQL healthy |

## Backend Coverage Highlights

- `FullMatchFlowTest`: create session, join two players, start match, generate traffic, submit route, verify packet status and score change.
- `PersistenceIntegrationTest`: verify session snapshots plus route action/event audit rows are persisted through JPA/H2.
- `MatchHistoryIntegrationTest`: verify persisted snapshots/actions/events drive match history, persistent leaderboard, post-game report, and replay timeline.
- Service tests cover routing validation, scoring, congestion, packet expiry, incidents, topology generation, packet generation, and invalid actions.

## Frontend Coverage Highlights

- Home screen session creation and difficulty selection.
- Lobby exposes a copyable session code for joining players.
- API client behavior for create/join/preview/submit and safe client payloads.
- Completed screen database report, replay timeline, and same-difficulty leaderboard.
- Game screen HUD, leaderboard, map mount, job panel behavior, and deadline countdown.
- WebSocket URL construction uses the frontend origin so Docker/nginx can proxy `/ws`.
- Incident/weather presentation helpers.

## Simulator Coverage Highlights

- Incident schema and JSON serializability.
- Weather/non-weather separation.
- Difficulty scaling.
- Simulator posting/printing behavior.

## Notes

PowerShell blocks `npm.ps1` on this machine, so Windows verification used `cmd.exe /c npm ...`. Git Bash, WSL, Linux, and macOS can use `./scripts/test-all.sh`.
