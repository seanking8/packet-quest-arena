# Packet Quest Arena - Demo Flashcards

## 1. Main Menu (The Hook)
*   **Visual:** Rotating 3D Globe (`PlanetScene`).
*   **Tech:** React Three Fiber + Spring Boot Backend.
*   **Role:** Global Network Operator.
*   **Action:** Starting the onboarding flow.

## 2. Tutorial (Core Loop)
*   **Goal:** Bridge nodes to deliver packets.
*   **Logic:** Every click is a server-side API call; backend validates the path.
*   **Cues:** Sound for "Valid Node" vs "Invalid"; "Success" sound on delivery.
*   **Mechanic:** Learning the source -> destination routing.

## 3. Global View (Topology)
*   **Nodes (Circles):**
    *   **Pink (Core):** Tier 1 Data Centers.
    *   **Green (Edge):** Local Compute/CDN.
    *   **Blue (Radio/O-RU):** Last-mile wireless access.
*   **Links (Lines):**
    *   **Green (Fibre):** Stable, high bandwidth.
    *   **Purple (mmWave):** Fast wireless, LOS dependent.
    *   **Yellow (Satellite):** High latency, global reach.

## 4. District View (Tactical)
*   **Packet Jobs:** Monitor TTL (Time to Live).
*   **Route Assist:** Visual highlights for valid next-hops.
*   **Link Status:**
    *   **Light Blue (Busy):** Safe.
    *   **Yellow (Congested):** Risk of drop.
    *   **Red (Overloaded):** High drop probability.

## 5. Dynamic Incidents (Chaos)
*   **Source:** Python Chaos Engine (Simulator) via WebSockets.
*   **Types:**
    *   **Fibre Cut:** Link hard-down (Route around!).
    *   **Power Outage:** Multiple nodes degraded.
    *   **Building Obstruction:** Degrades Radio/mmWave only.
    *   **Construction:** Random fibre risk.
*   **Weather:**
    *   **Electrical Storm:** Packet loss on wireless links.
    *   **High Winds:** High latency for towers.

## 6. Difficulty & Scaling
*   **Context:** Can be adjusted per session in Lobby.
*   **Easy:** Infrastructure-only (Construction/Congestion).
*   **Medium:** Mixed hardware + weather.
*   **Hard:** High-freq outages + traffic surges.

## 7. Competition & Wrap
*   **Leaderboard:** Real-time scoring based on latency + successful delivery.
*   **Closing:** Authoritative logic meets 3D strategy.
