# Security & Anti-Cheat Notes

Packet Quest Arena is a multiplayer browser game. Players send actions from an
untrusted client, so the backend is the single source of truth for all game
outcomes. This document explains the design, the controls that keep matches
fair, the validation rules, and the known limitations.

## Backend-authoritative design

The client may **request** actions but never **decides** results.

- The route submission body contains **only** `playerId`, `packetFlowId` and
  `path` (`RouteSubmissionRequest`). Score, latency, packet loss, delivery
  status and link load are **never** accepted from the client.
- Latency, packet-loss risk, delivery vs. drop, score delta and link load are
  all computed server-side in `RoutingService` / `ScoreCalculator`.
- The match timer is server-authoritative: `GameSession.remainingSeconds(now)`
  is derived from a server timestamp, and the scheduled `GameTickService` tick
  advances and ends matches. The client cannot extend or end a match.
- Extra fields a client tries to inject (e.g. `"score": 99999`) are ignored by
  Jackson binding and asserted to have no effect
  (`ActionControllerTest.submitRoute_clientSuppliedScoreIsIgnored`).

## Anti-cheat controls (enforced in `RoutingService`)

| Rule | Behaviour |
| --- | --- |
| Packet ownership | A player can only route a packet they own; routing another player's packet is rejected. |
| Session must be ACTIVE | Actions on a WAITING/COMPLETED or timed-out session are rejected. |
| Unknown nodes | A path that references a node not in the topology is rejected. |
| Broken resources | Paths through FAILED/EXPIRED links or failed nodes are rejected. |
| Connected path | Consecutive path nodes must be joined by a real link. |
| No double scoring | A packet is scored once; once DELIVERED/DROPPED it cannot be routed again. |
| No reviving expired packets | A packet past its deadline cannot be delivered. |

These are covered by `RoutingServiceTest` and the end-to-end
`FullMatchFlowTest`.

## Input validation (API edge)

All request bodies are validated with `@Valid` and Jakarta Bean Validation
before reaching a service:

- **Join** — `displayName` is `@NotBlank` and `@Size(max = 32)`.
- **Route** — `playerId` / `packetFlowId` are `@NotBlank`; `path` is
  `@NotNull`, `@Size(min = 2, max = 64)`, and each element is `@NotBlank`
  (no unbounded or empty-node paths).
- **Incident** (from the Python simulator) — `eventType` is a `@NotNull` enum;
  `severity` is bounded to `[0.0, 1.0]`; `durationSeconds` to `[0, 300]`;
  `message` to 200 characters. `IncidentService` re-checks these as defence in
  depth, and unknown target ids are skipped rather than trusted blindly.

## Safe error responses

`GlobalExceptionHandler` (`@RestControllerAdvice`) maps every exception to a
fixed `ErrorResponse` body of `{ status, error, message, timestamp }`:

- Known game errors map to meaningful codes — 404 (session not found), 409
  (rule violation), 422 (invalid route), 400 (validation / malformed body).
- Malformed JSON or an unparseable enum returns a generic
  *"Malformed or unreadable request body."* (the raw parser message, which can
  expose internal type names, is not returned).
- A catch-all handler returns a generic 500 *"An unexpected error occurred."* so
  **no stack trace, exception class name or internal message ever reaches the
  client**. Asserted by `errorResponse_doesNotLeakInternalDetails`.

## Secrets

- No credentials or tokens are committed. The datasource uses environment
  variables with dev-only defaults
  (`${SPRING_DATASOURCE_PASSWORD:pqpassword}`), and `.env` / `.env.local` are
  git-ignored. Set real values via environment variables in any real
  deployment.

## Known limitations / remaining risks

This is a course project, not a hardened production service. Out of scope for
now:

- **No authentication.** Anyone who knows a `sessionId` / `playerId` can act as
  that player. Packet *ownership* is still enforced, but identity is not proven.
  A production version would issue a per-player session token on join and
  require it on every action.
- **No rate limiting / abuse protection.** Route and incident endpoints are not
  throttled.
- **Permissive WebSocket origin.** The state-broadcast WebSocket allows all
  origins (`setAllowedOrigins("*")`); it is broadcast-only and carries no
  actions, but should be origin-restricted before public deployment.
- **In-memory state.** Sessions live in memory and are lost on restart; there is
  no persistence or audit log of actions.
- **Trusted simulator endpoint.** The incident endpoint is open (any caller can
  POST a valid incident). Acceptable while the simulator runs locally; it should
  be authenticated/internal-only in production.
