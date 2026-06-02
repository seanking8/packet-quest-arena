# Scalability Notes

This document describes how Packet Quest Arena behaves as load grows, the
bottlenecks in the current implementation, and the mitigations we would apply.
It is written against the code as it exists today, not an idealised design.

## Current Architecture

- **Live state store:** in-memory `ConcurrentHashMap` in `GameSessionRepository`.
  This keeps route validation, ticking, scoring, and broadcasts responsive.
- **Persistence:** MySQL stores the latest session snapshot plus player action
  audit rows and traffic/incident event audit rows. It is used for evidence and
  auditability, not as the hot-path live state engine.
- **Real-time updates:** the backend recomputes a full `GameStateDto` and
  broadcasts it over WebSocket (`/ws/game/{sessionId}`) on state changes and
  scheduled ticks. Clients without a socket fall back to polling `GET /state`.
- **Tick loop:** a scheduled backend task iterates active sessions and advances
  timers, packet jobs, link loads, and incidents.
- **Topology size today:** the MVP maps are intentionally readable demo maps,
  not 500-node production-scale maps.

## Target Scenario

| Target | Current approach | Notes |
| --- | --- | --- |
| 100 players | Up to 10 players per session, across 10 simultaneous sessions. | The lobby cap is 10 players so 10 sessions can cover the target. |
| 10 simultaneous sessions | Each session is isolated by `sessionId` in the backend repository and WebSocket channel. | Session work is independent, but a single backend instance still owns the live aggregate. |
| 500 nodes | The model stores nodes as lists and route validation resolves by scanning. | Fine for MVP maps; for 500 nodes, add indexed maps per session for O(1) node lookup. |
| 2,000 links | Link validation currently scans links to find each hop. | For larger maps, keep an adjacency map keyed by node pair to avoid repeated link scans. |
| 100 packet flows/minute | Packet generation and ticking are server-owned and bounded per player. | Existing scheduled tick can handle demo load; higher load should batch broadcasts. |

## Risks And Mitigations

### 1. WebSocket Fan-Out

**Risk:** every change can broadcast the entire game state to every connected
client. With large topologies and many players this becomes expensive.

**Mitigations:**

- Send deltas for changed links, nodes, packets, and incidents instead of full snapshots.
- Throttle and batch broadcasts on a fixed cadence.
- Compress frames and avoid sending map layers a client is not viewing.

### 2. In-Memory, Single-Instance Live State

**Risk:** live gameplay is held by one backend instance. Kubernetes can scale
pods, but a session must stay on the instance that owns its in-memory aggregate.

**Mitigations:**

- Use sticky routing by `sessionId` as a near-term deployment strategy.
- Move live session state to Redis or another shared low-latency store for real horizontal scaling.
- Use the existing MySQL snapshots as restart evidence; add full restore-from-snapshot only if required.

### 3. Database Access Pattern

**Risk:** writing every tiny visual change as a normalized row would be too
chatty and hard to query.

**Current approach:**

- one latest snapshot per session;
- one row per submitted player route action;
- one row per significant packet or incident event.

**Mitigations:**

- Index `session_id`, `player_id`, and event timestamps for assessor/reporting queries.
- Keep hot-path route checks in memory or Redis instead of querying MySQL per click.

### 4. Event Batching

**Risk:** auto-weather, scheduled ticks, route submissions, and incident updates
can each trigger state broadcasts.

**Mitigations:**

- Mark state dirty and flush on a fixed schedule rather than every mutation.
- Cap active incidents and packet jobs per session.
- Batch event audit writes if write volume grows.

### 5. Frontend Rendering Performance

**Risk:** the 3D scenes re-render when state arrives. At 500 nodes and 2,000
links, the scene can become expensive and visually dense.

**Mitigations:**

- Use the 2D tactical map as the default for very large graphs.
- Instance repeated meshes for nodes, links, and buildings.
- Memoise derived geometry and update only changed graph objects.
- Add clustering, filtering by packet source/destination, and level-of-detail rendering.

## Summary

The current game is appropriate for classroom/demo scale and supports the
assessment story for 100 players by distributing them across 10 sessions. The
first things to improve for real high load are full-state WebSocket fan-out,
single-instance in-memory live state, and dense 3D rendering. The database now
provides useful persistence and audit evidence, but it is deliberately not the
hot-path engine for moment-to-moment gameplay.
