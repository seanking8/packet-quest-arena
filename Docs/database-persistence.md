# Database Persistence

The project uses MySQL for persistence and auditability while keeping the live game engine in memory for fast ticking and route validation. This keeps gameplay responsive and still satisfies the requirement for persisted sessions, topology, actions, traffic events, and scores.

## Tables

| Table | Purpose | Requirement covered |
| --- | --- | --- |
| `game_session_snapshots` | Stores the latest backend-owned `GameStateDto` as JSON plus searchable summary columns. | Sessions, topology, scores, packet flows, incidents |
| `player_action_audit` | Stores each submitted route action with player id, packet id, path JSON, result status, latency, and score delta. | Player actions, scoring audit |
| `traffic_event_audit` | Stores packet delivery/drop events and incident events with JSON payloads. | Traffic events, incident history |

## Why Snapshot JSON Is Used

The game state is an aggregate made of players, nodes, links, packet flows, incidents, map objects, timers, and round state. Mapping every nested object as a large relational graph would add risk late in the project. Snapshot persistence gives the team a durable, inspectable database record without changing the authoritative game rules.

## Runtime Behavior

- `GameSessionRepository.save(...)` stores/updates the in-memory session and writes a database snapshot when persistence is enabled.
- `RoutingService.submitRoute(...)` writes an action audit row and a packet event row after the backend has computed outcome, latency, and score.
- `IncidentService.applyIncident(...)` writes an incident event row after the backend validates and applies the incident.
- Tests keep persistence disabled by default, then enable it in `PersistenceIntegrationTest` to verify the database path.

## How To Verify Manually In Docker

1. Start the stack with `docker compose up --build`.
2. Create and play a session in the browser.
3. Connect to MySQL on `localhost:3307` using database `packetquest`, user `pquser`, password `pqpassword`.
4. Inspect:

```sql
SELECT session_id, status, player_count, node_count, link_count, packet_flow_count, score_total
FROM game_session_snapshots;

SELECT session_id, player_id, packet_flow_id, action_type, result_status, latency_ms, score_delta
FROM player_action_audit;

SELECT session_id, event_type, subject_id, created_at
FROM traffic_event_audit;
```
