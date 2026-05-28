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