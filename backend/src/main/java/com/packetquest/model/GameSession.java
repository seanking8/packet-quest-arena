package com.packetquest.model;

import java.time.Duration;
import java.time.Instant;
import java.util.List;
import java.util.UUID;
import java.util.concurrent.CopyOnWriteArrayList;

/**
 * In-memory aggregate that holds the full truth of a single match: players,
 * topology (nodes + links), packet flows and incidents, plus the match clock.
 *
 * <p>The backend is authoritative. The frontend never computes score, latency,
 * delivery result or link load — it only reads state derived from this object.
 * This class is a plain POJO (no JPA mapping); live game state is kept in
 * memory via {@code GameSessionRepository}.
 */
public class GameSession {

    /** Default match length in seconds. */
    public static final int DEFAULT_DURATION_SECONDS = 300;

    /** A match is played as this many rising-difficulty rounds. */
    public static final int TOTAL_ROUNDS = 3;
    /** Fixed length of every round, in seconds (kept short for demos). */
    public static final int ROUND_LENGTH_SECONDS = 90;

    private final String id = UUID.randomUUID().toString();
    private SessionStatus status = SessionStatus.WAITING;
    private GameDifficulty difficulty = GameDifficulty.MEDIUM;
    private int durationSeconds = DEFAULT_DURATION_SECONDS;
    /** Current round (1..TOTAL_ROUNDS); 0 while still WAITING. */
    private int currentRound = 0;
    /** Map family the host chose at start ("CITY" or "DISTRICT"); display-only,
        broadcast so every player renders the same map. */
    private String mapFamily = "CITY";

    private final Instant createdAt = Instant.now();
    /** Set when the match transitions to ACTIVE; null while WAITING. */
    private Instant startedAt;
    /** Set when the match transitions to COMPLETED. */
    private Instant endedAt;

    private final List<Player> players = new CopyOnWriteArrayList<>();
    private final List<NetworkNode> nodes = new CopyOnWriteArrayList<>();
    private final List<NetworkLink> links = new CopyOnWriteArrayList<>();
    private final List<PacketFlow> packetFlows = new CopyOnWriteArrayList<>();
    private final List<IncidentEvent> incidents = new CopyOnWriteArrayList<>();
    private final List<MapObject> mapObjects = new CopyOnWriteArrayList<>();

    // --- Lifecycle ---------------------------------------------------------

    /** Starts the match using the current time. */
    public void start() {
        start(Instant.now());
    }

    /** Starts the match (round 1) at an explicit instant (deterministic tests). */
    public void start(Instant at) {
        this.status = SessionStatus.ACTIVE;
        this.startedAt = at;
        if (this.currentRound < 1) this.currentRound = 1;
    }

    /** True if there is another round after the current one. */
    public boolean hasNextRound() {
        return currentRound < TOTAL_ROUNDS;
    }

    /** End the current round: freeze into intermission (standings shown). */
    public void endRound(Instant at) {
        this.status = SessionStatus.INTERMISSION;
        this.endedAt = at; // marks when the round froze
    }

    /** Begin the next round: advance the counter and restart the clock. */
    public void startNextRound(Instant at) {
        this.currentRound = Math.min(TOTAL_ROUNDS, this.currentRound + 1);
        this.status = SessionStatus.ACTIVE;
        this.startedAt = at;
        this.endedAt = null;
    }

    /** Marks the match completed using the current time. */
    public void complete() {
        complete(Instant.now());
    }

    public void complete(Instant at) {
        this.status = SessionStatus.COMPLETED;
        this.endedAt = at;
    }

    // --- Clock -------------------------------------------------------------

    /** Seconds left in the match, evaluated against the current time. */
    public long getRemainingSeconds() {
        return remainingSeconds(Instant.now());
    }

    /**
     * Seconds left in the match, evaluated against the supplied instant.
     *
     * <ul>
     *   <li>WAITING — the full duration (clock hasn't started).</li>
     *   <li>ACTIVE — duration minus elapsed time, clamped at 0.</li>
     *   <li>COMPLETED — 0.</li>
     * </ul>
     */
    public long remainingSeconds(Instant now) {
        if (status == SessionStatus.COMPLETED || status == SessionStatus.INTERMISSION) {
            return 0;
        }
        if (status == SessionStatus.WAITING || startedAt == null) {
            return durationSeconds;
        }
        long elapsed = Duration.between(startedAt, now).getSeconds();
        return Math.max(0, durationSeconds - elapsed);
    }

    // --- Mutators ----------------------------------------------------------

    /** Creates and registers a new player, returning it. */
    public Player addPlayer(String displayName) {
        Player player = new Player(displayName);
        players.add(player);
        return player;
    }

    /** Creates and registers a new player with an assigned colour, returning it. */
    public Player addPlayer(String displayName, String color) {
        Player player = new Player(displayName, color);
        players.add(player);
        return player;
    }

    public void addPlayer(Player player) {
        players.add(player);
    }

    public void addNode(NetworkNode node) {
        nodes.add(node);
    }

    public void addLink(NetworkLink link) {
        links.add(link);
    }

    public void addPacketFlow(PacketFlow flow) {
        packetFlows.add(flow);
    }

    public void addIncident(IncidentEvent incident) {
        incidents.add(incident);
    }

    public void addMapObject(MapObject mapObject) {
        mapObjects.add(mapObject);
    }

    // --- Accessors ---------------------------------------------------------

    public String getId() {
        return id;
    }

    public SessionStatus getStatus() {
        return status;
    }

    public void setStatus(SessionStatus status) {
        this.status = status;
    }

    public GameDifficulty getDifficulty() {
        return difficulty;
    }

    public void setDifficulty(GameDifficulty difficulty) {
        this.difficulty = difficulty != null ? difficulty : GameDifficulty.MEDIUM;
    }

    public String getMapFamily() {
        return mapFamily;
    }

    public void setMapFamily(String mapFamily) {
        if (mapFamily == null) return;
        String v = mapFamily.trim().toUpperCase();
        if (v.equals("CITY") || v.equals("DISTRICT")) {
            this.mapFamily = v;
        }
    }

    public int getCurrentRound() {
        return currentRound;
    }

    public int getTotalRounds() {
        return TOTAL_ROUNDS;
    }

    public int getDurationSeconds() {
        return durationSeconds;
    }

    public void setDurationSeconds(int durationSeconds) {
        this.durationSeconds = durationSeconds;
    }

    public Instant getCreatedAt() {
        return createdAt;
    }

    public Instant getStartedAt() {
        return startedAt;
    }

    public Instant getEndedAt() {
        return endedAt;
    }

    public List<Player> getPlayers() {
        return players;
    }

    public List<NetworkNode> getNodes() {
        return nodes;
    }

    public List<NetworkLink> getLinks() {
        return links;
    }

    public List<PacketFlow> getPacketFlows() {
        return packetFlows;
    }

    public List<IncidentEvent> getIncidents() {
        return incidents;
    }

    public List<MapObject> getMapObjects() {
        return mapObjects;
    }
}
