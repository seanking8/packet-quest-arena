# AI Usage Log

All AI-assisted contributions must be logged here. Each entry must include what was generated, what was reviewed, and what was changed.

| Date | Tool | Purpose | Output Used | Reviewed By | Changes Made |
|------|------|---------|-------------|-------------|--------------|
| | | | | | |
## Frontend /api proxy fix
- Purpose: Create Session button did nothing; diagnosed via browser console.
- Finding (AI-assisted): /api/sessions returned 404 because the Docker frontend
  is served by nginx, which had no proxy rule. The Vite proxy only works in dev.
- Action: added frontend/nginx.conf to forward /api/ to the backend container,
  and updated frontend/Dockerfile to copy it into the nginx image.
- Review: reviewed and understood the nginx config and why dev vs Docker differ.
  Decision accepted.

## Short join code (backend)
- Purpose: replace the 36-char UUID shown to players with a short typeable code.
- Action (AI-assisted): added a 6-char joinCode to GameSession, findByJoinCode/
  existsByJoinCode to the repository, and code generation + lookup-by-code in
  GameService. Kept UUID as the internal primary key.
- Review: chose a separate human-facing code over making the code the PK; used
  SecureRandom and excluded ambiguous characters. Reviewed and accepted.

## Lobby UI: show short join code (frontend)
- Purpose: after creating a session the UI showed the internal UUID and jumped
  straight into the game, so a second player had no code to join with.
- Action (AI-assisted): reworked LobbyPage so Create shows the short joinCode
  with a Copy button and an "Enter Game" button instead of entering immediately;
  Join now uses the short code, requires a name, and shows a friendly message
  on failure instead of failing silently.
- Review: reviewed the component logic; confirmed it uses session.joinCode for
  display and session.id internally. Noted as a future improvement: surface the
  backend's safe error message in api.js rather than a generic message. Accepted.

## Backend safe error handling (lobby)
- Purpose: invalid join codes threw a raw 500 exposing internals, failing the
  "safe error message" criterion and the security requirement.
- Action (AI-assisted): added SessionNotFoundException + a GlobalExceptionHandler
  mapping it to 404, validation errors to 400, other bad input to 400, and a
  catch-all to a generic 500 (no stack traces). GameService now throws the
  custom exception. Added negative controller tests (invalid code -> 404,
  blank name -> 400).
- Review: reviewed each mapping; confirmed the catch-all returns no internal
  detail. Verified all 4 tests pass. Accepted.

## Network topology generation (backend)
- Purpose: generate and persist a network of nodes and links per session.
- Action (AI-assisted): added Node and Link entities + repositories and a
  TopologyFactory (Factory pattern, per learning objectives) that builds 6 nodes
  in a ring plus 2 cross-links (8 total); wired into GameService.createSession.
- Issues found & fixed during review: (1) main application class had been moved
  into the exception package, so Spring scanned 0 repositories — moved it back to
  com.packetquest; (2) MySQL reserved-word columns 'load' (and source/target)
  broke table creation — mapped them to explicit column names (link_load,
  source_node_id, target_node_id).
- Verified via DB: session has 6 nodes / 8 links, each link has capacity,
  latency, load, status. Accepted.

## story 5
## Game state API

We needed one endpoint the frontend could call to get everything about a session
at once - its status, who's in it, the network layout, and (later) the packet
flows and score. We worked through this with AI help.

What we built: a GET /api/sessions/{id}/state endpoint. Behind it there's a
response class (GameStateResponse) that bundles all the bits together, a method
in GameService that gathers them from the database, and the controller route
itself. If someone asks for a session that doesn't exist, it reuses the same
"not found" handling we built for the lobby, so it returns a clean 404 instead
of crashing.

Something we caught and fixed: our first attempt just returned the raw database
objects straight to the browser. That looked fine until we checked the actual
output - every node and link had the whole session object stuffed inside it,
repeated 14 times, and it was exposing the join code, which is meant to stay
private. So we swapped to small "view" objects that only include the fields the
frontend actually needs. Cleaner response, and nothing internal leaks out.

One decision worth noting: packet flows and score don't exist yet (those are
later stories), but we still added them to the response as an empty list and a
zero. That way the shape of the response won't change when we add them later, so
the frontend won't break.

How we checked it: hit the endpoint with curl - a real session gave back the full
clean state, and a made-up id gave back a safe 404. Happy with it, kept it.

## story 6
## Showing the network board

We wanted the network to actually appear in the browser instead of a blank page.
Worked through this with AI.

The hook that fetches game state was trying to use a WebSocket endpoint we
haven't built yet (that's a later story), so it was connecting to nothing and the
board stayed empty. We switched it to just poll our REST state endpoint every 2
seconds for now - when we build real-time updates later, only this hook changes.

Then we updated the board component to read the nodes and links from the state
and draw them with React Flow, colouring each link green/amber/red depending on
how loaded it is (and grey/amber for down/degraded). Everything's green right now
because there's no traffic yet, but the colour logic is ready for when there is.

Hit a snag: the page went completely blank. The console showed the Scoreboard
component was expecting a list of per-player scores and crashing on our single
score number. Per-player scoring isn't built yet, so we simplified Scoreboard to
just show the one score. Page came back and the board drew correctly - 6 nodes,
8 links, all labelled. Kept it.

## stage7
## Generating packet traffic

We needed flows of network traffic for players to route. Worked through this
with AI.

Added a PacketFlow entity (source node, destination node, traffic type, status,
bandwidth), a repository, and a PacketFlowFactory that builds five flows per
session - always one EMERGENCY and one BACKGROUND (the story requires both),
plus three random others from VIDEO/IOT/CONTROL. Wired into createSession beside
topology generation. The flow data is exposed through the game-state endpoint
as a FlowView (no entity back-references, same approach we took with nodes and
links).

A few things we caught while building:
- IntelliJ auto-imported javax.swing.text.FlowView into the DTO when we added
  our inner FlowView class. Wrong FlowView entirely - removed the import.
- Used explicit @Column names (source_node_id, destination_node_id,
  traffic_type) to avoid the reserved-word problem we hit with link.load
  during the topology story.

Scope decision: flows are generated at session creation for now. When we build
"Start game session" (story 14, P1) they'll move to the start action - noted in
the design decisions doc so we don't forget.

Verified: curl on the state endpoint returns 5 flows with all required fields,
both EMERGENCY and BACKGROUND present. Accepted.

