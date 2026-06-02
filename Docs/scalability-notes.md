# Scalability Notes

This document describes how Packet Quest Arena behaves as load grows, the
bottlenecks in the **current** implementation, and the mitigations we would
apply. It is written against the code as it actually exists today, not an
idealised design.

## Current architecture (the starting point)

- **State store:** in-memory `ConcurrentHashMap` in `GameSessionRepository`.
  Sessions are **not** persisted to MySQL during play (JPA/MySQL are wired for
  future use but the live game state lives in memory on a single backend
  instance).
- **Real-time updates:** the backend recomputes the **full** `GameStateDto` and
  broadcasts it over WebSocket (`/ws/game/{sessionId}`) on every change and on
  every scheduled tick. Clients without a socket fall back to polling
  `GET /state` every ~1.5s.
- **Tick loop:** a single `@Scheduled` task (`GameTickService`, ~1s) iterates
  all ACTIVE sessions and broadcasts.
- **Topology size today:** ~17 nodes / ~25 links per session.

This is appropriate for classroom/demo scale (a handful of sessions, 2–4
players each). The notes below project beyond that.

## Behaviour at target loads

| Dimension | Target | Expected behaviour today | Main risk |
|---|---|---|---|
| Players | 100 | Works if spread over sessions; a single session broadcasts full state to every member each tick | WebSocket fan-out + payload size |
| Network nodes | 500 | State payload and frontend scene grow ~30× vs. today | Payload size, 3D render cost |
| Links | 2000 | Dijkstra route-assist and per-tick link recompute grow with edge count | CPU per tick, render cost |
| Packet flows | 100 / min | Job generation + expiry are cheap; fine | Minor |
| Simultaneous sessions | 10 | Single tick thread loops all sessions sequentially each second | Tick duration, single-instance memory |

## Risks and mitigations

### 1. WebSocket fan-out
**Risk:** every change broadcasts the *entire* game state to *every* connected
client. With large topologies and many players this is O(players × stateSize)
per tick.
**Mitigations:**
- Send **deltas** (changed links/nodes/packets) instead of the full snapshot.
- **Throttle/batch** broadcasts (e.g. coalesce to a fixed 4–10 Hz cadence)
  instead of broadcasting on every mutation.
- Compress frames; only include layers a client is actually viewing.

### 2. In-memory, single-instance state
**Risk:** all live state is on one backend instance; it can't be horizontally
scaled and is lost on restart. The k8s `backend` HPA can scale pods, but a
session is pinned to whichever instance holds it in memory.
**Mitigations:**
- Move authoritative session state to a shared store (Redis) so any pod can
  serve any session; or use sticky sessions + session affinity as a stopgap.
- Persist periodic snapshots so a restart doesn't drop in-flight matches.

### 3. Database indexing
**Risk:** not exercised yet (gameplay is in-memory), but if sessions/results
move to MySQL, unindexed lookups by `sessionId`/`playerId` would scan.
**Mitigations:**
- Index `session_id`, `player_id`, and `(session_id, status)` on packet/flow
  tables; keep hot-path reads off the DB by caching active state in memory/Redis.

### 4. Event batching
**Risk:** auto-weather + tick + route submissions can each trigger a broadcast,
producing bursts.
**Mitigations:**
- Mark state "dirty" and flush on a fixed schedule rather than per-event.
- Cap concurrent incidents (already done: `MAX_CONCURRENT_INCIDENTS`).

### 5. Frontend rendering performance
**Risk:** the 3D scenes (react-three-fiber) re-render on every state push; at
500 nodes / 2000 links the draw call count and per-frame work climb sharply.
**Mitigations:**
- **Instance** repeated meshes (nodes, buildings, links) instead of one mesh
  each; the 2D map already auto-fits and is far cheaper for large graphs.
- Memoise derived geometry; only update changed nodes/links.
- Throttle state application on the client to animation frames.

### 6. Link-state update frequency
**Risk:** recomputing link status/utilisation and re-broadcasting every 1s
scales with link count and session count.
**Mitigations:**
- Only recompute links whose load actually changed since last tick.
- Lower the tick rate for large sessions, or make it adaptive.

## Summary

The game is correct and comfortable at demo scale. The first things that would
break under real load are, in order: **WebSocket full-state fan-out**, the
**single in-memory backend instance**, and **frontend 3D render cost** for very
large topologies. The mitigations above (deltas + batching, shared/Redis state,
mesh instancing) are the natural next steps and are not yet implemented.
