# Security Notes

A running record of the security-relevant decisions and where each is enforced.
Updated as we build, so by submission this is our Security Notes deliverable.

## Server-side validation of player actions
- The backend never trusts the client. Every routing action is re-checked
  against the database before being applied.
- Enforced in `GameService.routeFlow`: session exists, player exists, player
  belongs to *this* session, flow exists and is still PENDING, path starts at
  the flow's source and ends at its destination, each path hop is a real link.
- Side effects (link load, flow status) run inside one `@Transactional` block,
  so a half-applied action cannot leave the database in a corrupt state.
- Tests: `GameServiceTest` covers every rejection path plus the happy path.

## Safe error responses
- `GlobalExceptionHandler` maps known errors to clean JSON ({"error":"..."}).
  Unknown errors map to a generic 500 with no stack trace or internal detail.
- This addresses the spec's "error messages do not expose internal details."

## No leaked entity internals in API responses
- `GameStateResponse` uses lightweight view classes (PlayerView/NodeView/
  LinkView/FlowView) instead of returning JPA entities directly. This prevents
  Jackson from walking entity back-references and exposing internal fields
  (e.g. the session join code) to the client.

## Lightweight player identity
- Each browser includes its `playerId` (assigned by the backend on create/join)
  with every action. The backend verifies the player belongs to the session
  being acted on. This is intentionally lightweight - the spec allows it.
- Returned 400 (not 403) when the player doesn't belong, because there is no
  authenticated identity to "deny" - the request is simply invalid against
  current state. If proper authentication is added later, this becomes 403.

## Scoring is server-only (planned)
- The score field is calculated by the backend and only read by the frontend.
  Even though scoring is not yet built (story 11), the API contract already
  exposes `score` as a read-only number with no setter on the client side.



