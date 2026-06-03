# Shared Multiplayer Demo Runbook

Use this setup when the team wants a one-time live demo with players on separate laptops.

## What This Proves

- Separate players can join one shared session from different devices.
- The Spring Boot backend is the single source of truth for game state.
- WebSocket updates keep every browser synchronized.
- MySQL stores completed-match evidence: history, difficulty leaderboard, post-game report, and replay timeline.

## Recommended Demo Setup

Only one laptop should host the stack.

```bash
docker compose up --build
```

Everyone else joins through the host laptop's demo URL. They do not need Docker running.

## Host Checklist

1. Put all demo laptops on a network that can reach the host laptop.
2. On the host laptop, run `docker compose up --build`.
3. Find the host laptop's IPv4 address:

   ```powershell
   ipconfig
   ```

   Use the IPv4 address under the active network adapter.

4. On the host laptop, open:

   ```text
   http://<HOST_IPV4>:3000
   ```

   Example:

   ```text
   http://192.168.1.23:3000
   ```

5. Create the match, pick a difficulty, and wait in the lobby.
6. Copy the lobby session code and send it to the other players.
7. Start the match after at least two players have joined.

## Player Checklist

1. Open the host's game URL.
2. Enter a display name.
3. Paste the session code into `Join a match`.
4. Click `Join session`.
5. Wait for the host to start the match.
6. Route packet jobs during the match.

## Firewall Notes

For the one-host demo, teammates only need to reach the frontend port:

```text
3000
```

The frontend proxies REST calls and WebSocket traffic to the backend inside Docker, so players should not need to call backend port `8080` directly.

If teammates cannot load the page:

- Check that the host can open `http://<HOST_IPV4>:3000`.
- Allow Docker Desktop or port `3000` through Windows Firewall if Windows prompts.
- Avoid networks that block device-to-device traffic.

## Demo Talk Track

Use this short explanation:

> For the live demo, we run one shared game server and one shared MySQL database on the host laptop. Each player joins from their own laptop using the same session code. The backend owns the match state, validates routes, applies congestion and incidents, calculates scores, and broadcasts updates over WebSocket. MySQL stores completed-match evidence such as leaderboards, match reports, and replay history.

Then show:

1. Two to four players joining the same lobby.
2. One player routing a packet and the others seeing the updated shared state.
3. Congestion/incidents affecting everyone on the same map.
4. Game-over leaderboard and database-backed report.

## Why Not Kubernetes For The Live Demo?

Kubernetes is still useful as deployment evidence, but Docker Compose is the safer live-demo setup. It has fewer moving parts and still proves the important multiplayer behavior: separate browsers on separate laptops sharing one backend and one database.
