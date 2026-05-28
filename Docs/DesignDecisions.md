# Packet Quest Arena — Design Decisions

A running record of product/design decisions, so the team and reviewers can see
what was chosen and why. Update as decisions change.

## UI Direction
- **Target style:** 2D isometric / hex tile board, inspired by Into the Breach
  and similar pixel-art tactics games (clean grid, readable icons, side action
  panel, turn/score indicators).
- **3D board with zoomable avatars/infrastructure:** desired, but deferred to a
  later stage. NOT part of the MVP. The spec only requires "simple shapes,
  canvas, SVG, or a frontend graph library," so a polished 2D board fully
  satisfies the requirements. 3D is a stretch/post-MVP goal only.

## Gameplay Logic (in scope for MVP)
- **Currency / cost actions:** players spend resources to upgrade link capacity,
  etc. Aligns with spec ("increase capacity at a cost") and scoring
  ("cost of actions").
- **Incidents / waves:** congestion and failures occur over time; players plan
  for them. Aligns with spec ("incidents occur, such as link failures or
  congestion").
- **Visual fault indicators:** show packet loss, congestion, and misconfig
  visually on the board (e.g. red/degraded links, dropped-packet markers).
  Mostly a frontend concern.

## Deferred / Stretch
- **3D board & zoom** (see above).
- **Mentor character that turns against the player:** narrative idea, outside
  current acceptance criteria. Park as a stretch goal. Note overlap with the
  spec's AI stretch goals (an AI route advisor giving intentionally incomplete
  advice is effectively a "mentor you learn not to trust").

## Rationale notes
- Anything outside the spec's acceptance criteria is treated as stretch, to keep
  MVP effort focused on graded requirements.