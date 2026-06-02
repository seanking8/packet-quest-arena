# Test Evidence

Last verified on 2026-06-02.

| Area | Command | Result |
| --- | --- | --- |
| Backend | `cd backend && mvn test` | 113 tests passed, 0 failures, 0 errors |
| Frontend | `cd frontend && cmd.exe /c npm test` | 6 files passed, 26 tests passed |
| Simulator | `python -m pytest simulator/tests -q` | 18 tests passed |
| Frontend build | `cd frontend && cmd.exe /c npm run build` | Production build succeeded |

## Backend Coverage Highlights

- `FullMatchFlowTest`: create session, join two players, start match, generate traffic, submit route, verify packet status and score change.
- `PersistenceIntegrationTest`: verify session snapshots plus route action/event audit rows are persisted through JPA/H2.
- Service tests cover routing validation, scoring, congestion, packet expiry, incidents, topology generation, packet generation, and invalid actions.

## Frontend Coverage Highlights

- Home screen session creation and difficulty selection.
- API client behavior for create/join/preview/submit and safe client payloads.
- Game screen HUD, leaderboard, map mount, job panel behavior, and deadline countdown.
- Incident/weather presentation helpers.

## Simulator Coverage Highlights

- Incident schema and JSON serializability.
- Weather/non-weather separation.
- Difficulty scaling.
- Simulator posting/printing behavior.

## Notes

PowerShell blocks `npm.ps1` on this machine, so Windows verification used `cmd.exe /c npm ...`. Git Bash, WSL, Linux, and macOS can use `./scripts/test-all.sh`.
