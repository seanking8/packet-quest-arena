# Packet Quest Arena - Product Demo Script

## Scene 1: Main Menu & The Hook
**Visuals:** `HomeScreen.jsx` with the 3D rotating planet background (`PlanetScene`).
*   **Opening:** "Welcome to Packet Quest Arena. You’re looking at a real-time, multi-user networking strategy game. I’m stepping into the role of a Global Network Operator."
*   **The World:** "The 3D environment is rendered using React Three Fiber. It’s a visualization of the authoritative global network state managed by our Spring Boot backend."
*   **Call to Action:** "From here, we can jump into the tutorial to learn the basics or start a live session."

## Scene 2: The Tutorial (The Routing Loop)
**Visuals:** `TutorialScreen.jsx` and `TutorialDistrictScene.jsx`.
*   **Objective:** "The tutorial introduces the core mechanic: successful packet delivery. We start in a simplified district to learn how to bridge nodes."
*   **Interaction:** "Players learn to select a source and build a path link-by-link. Every selection is validated server-side to ensure the path is physically possible within the network topology."
*   **Feedback:** "We use distinct audio cues for valid node selection and successful routing, ensuring the operator knows exactly when a connection is established."

## Scene 3: Lobby & Difficulty Selection
**Visuals:** `LobbyScreen.jsx`.
*   **Difficulty Tiers:** "We can choose between Easy, Medium, and Hard. This isn't just a point multiplier; it changes the network's physics."
*   **Technical Impact:** 
    *   **Easy:** "Lower background traffic and a focus on basic infrastructure incidents like construction."
    *   **Medium:** "A balance of weather interference and hardware failures."
    *   **Hard:** "High-velocity traffic surges and frequent link outages. The Python simulator is tuned here to maximize chaos."

## Scene 4: Strategic View & Topology
**Visuals:** `GameScreen.jsx` showing the global `PlanetScene`.
*   **Topology:** "Let's look at the map. The circles represent **Nodes**—these are our network routers and data centers. The lines are **Links**, the physical connections between them."
*   **Node Types:** "We have a hierarchical network: **Core Nodes** (pink) represent major data centers, **Edge Nodes** (green) are closer to the user, and **Radio Towers/O-RUs** (blue) handle wireless access."
*   **Link Types:** "The link colors tell us the medium: **Fibre** (green) is high-capacity, while **mmWave** (purple) and **Satellite** (yellow) offer flexibility but are more vulnerable to environmental changes."

## Scene 5: Tactical District View (Core Gameplay)
**Visuals:** Zooming into a city to show the 2D `TacticalMap`.
*   **Packet Jobs:** "The **Packet Jobs Panel** shows our active delivery requests. Each packet has a 'Time to Live' (TTL). If it doesn't reach the destination node in time, it's dropped."
*   **Active Routing:** "I'm building a route now. The **Route Assist** highlights valid next-hops. I need to balance path length against link status."
*   **Link Status:** "Notice the links changing color. A light blue link is 'Busy', but a yellow one is 'Congested'. If I route through a congested link, the packet might be dropped by the backend's traffic simulator."

## Scene 6: Dynamic Incidents (Real Chaos)
**Visuals:** An incident zone appearing on the map (rendered via `IncidentZones.jsx`).
*   **The Incident Feed:** "Look at the feed on the left. The simulator just triggered a **Fibre Cut** in this sector. That link is now 'Failed' and unusable."
*   **Real Incidents:** "We deal with real-world scenarios: **Power Outages** that degrade entire districts, **Building Obstructions** affecting wireless links, and **Construction** crews accidentally severing lines."
*   **Weather Effects:** "We also see dynamic weather. An **Electrical Storm** (purple zone) increases packet loss on wireless links, while **High Winds** (blue zone) cause instability for radio towers."

## Scene 7: Real-time Response & Conclusion
**Visuals:** Rerouting a packet around an incident.
*   **Adaptation:** "As an operator, I have to adapt. I’m rerouting this packet through a Satellite link to bypass the Fibre Cut. It’s slower, but it ensures delivery before the TTL expires."
*   **The Competitive Edge:** "In a live match, I'm competing for the highest score on the **Leaderboard**, which is calculated based on successful deliveries, latency, and path efficiency."
*   **Final Word:** "Packet Quest Arena demonstrates how complex, authoritative network logic can be visualized and managed in real-time, providing a high-stakes strategic experience."
