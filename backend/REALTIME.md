# Packet Quest Arena — Real-Time Updates

## Mechanism

Raw **WebSocket** (Spring `spring-boot-starter-websocket`). The backend pushes
the full authoritative `GameStateDto` to every client connected to a session
whenever the state changes.

- **Endpoint:** `ws://<host>:8080/ws/game/{sessionId}`
- **Handler:** `GameWebSocketHandler` tracks connected sessions and broadcasts
  text frames. Inbound client frames are ignored — clients **cannot** patch
  state over the socket.
- **Broadcaster:** `GameStateBroadcaster` (interface) →
  `WebSocketGameStateBroadcaster` serialises `GameStateDto` to JSON and sends it
  to all clients of that session.

## When state is broadcast

| Event | Source |
|---|---|
| Player joins | `GameService.joinPlayer` |
| Match starts | `GameService.startSession` |
| Route submitted | `RoutingService.submitRoute` |
| Tick runs (decay/expiry/replenish/complete) | `GameTickService.tick` |
| Incident applied | `IncidentService.applyIncident` |

The match-completed state is delivered via the tick that flips status to
`COMPLETED`.

## Authority / security

- The backend is the single source of truth. Clients never send score, latency,
  delivery result or link load.
- All actions go through validated REST endpoints (`/players`, `/start`,
  `/actions/route`, `/tick`, `/incidents`); the WebSocket is **broadcast-only**.

## Frontend connection (starter)

```js
const ws = new WebSocket(`ws://localhost:8080/ws/game/${sessionId}`);
ws.onmessage = (e) => {
  const state = JSON.parse(e.data); // GameStateDto
  renderGame(state);                // update 3D scene + HUD
};
// Player actions still use REST (fetch POST), never the socket:
await fetch(`/api/sessions/${sessionId}/actions/route`, {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ playerId, packetFlowId, path }),
});
```

## Polling fallback

If the WebSocket is unavailable, clients poll:

```
GET /api/sessions/{sessionId}/state    # every 1–2 seconds
```

This returns the same `GameStateDto`. The frontend can detect a socket
failure (`onerror`/`onclose`) and switch to a polling timer.

## Manual verification

1. `POST /api/sessions` → get `sessionId`.
2. Open two WebSocket clients to `ws://localhost:8080/ws/game/{sessionId}`
   (e.g. `websocat` or two browser tabs).
3. `POST /api/sessions/{id}/players` twice (Alice, Bob) → both sockets receive
   updated state with the new player.
4. `POST /api/sessions/{id}/start` → both receive ACTIVE state with topology +
   packet jobs.
5. `POST /api/sessions/{id}/actions/route` from one player → both receive
   updated link load / scores.
6. `POST /api/sessions/{id}/tick` → both receive decayed load / expirations.

## Limitations

- Raw WebSocket (not STOMP); messages are full-state snapshots, not deltas.
- In-memory, single-instance broadcast — horizontal scaling would need a shared
  bus (e.g. Redis pub/sub) and sticky sessions.
- No auth on the socket yet (MVP); add a token/handshake check before exposing
  beyond local play.
- Best-effort delivery: a failed send never breaks a tick or REST action.
