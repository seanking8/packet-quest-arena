package com.packetquest.persistence;

import com.packetquest.model.GameDifficulty;
import com.packetquest.model.SessionStatus;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.Id;
import jakarta.persistence.Lob;
import jakarta.persistence.Table;

import java.time.Instant;

/**
 * Latest persisted authoritative state for a game session.
 *
 * <p>The game engine still runs against the in-memory aggregate for responsive
 * play, while this table gives the database a durable record of sessions,
 * topology, packet flows, incidents, scores, and current match status.
 */
@Entity
@Table(name = "game_session_snapshots")
public class GameSessionSnapshotEntity {

    @Id
    private String sessionId;

    @Enumerated(EnumType.STRING)
    private SessionStatus status;

    @Enumerated(EnumType.STRING)
    private GameDifficulty difficulty;

    private String mapFamily;
    private int currentRound;
    private int playerCount;
    private int nodeCount;
    private int linkCount;
    private int packetFlowCount;
    private int incidentCount;
    private int scoreTotal;
    private Instant updatedAt;

    @Lob
    @Column(columnDefinition = "LONGTEXT")
    private String stateJson;

    public String getSessionId() {
        return sessionId;
    }

    public void setSessionId(String sessionId) {
        this.sessionId = sessionId;
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
        this.difficulty = difficulty;
    }

    public String getMapFamily() {
        return mapFamily;
    }

    public void setMapFamily(String mapFamily) {
        this.mapFamily = mapFamily;
    }

    public int getCurrentRound() {
        return currentRound;
    }

    public void setCurrentRound(int currentRound) {
        this.currentRound = currentRound;
    }

    public int getPlayerCount() {
        return playerCount;
    }

    public void setPlayerCount(int playerCount) {
        this.playerCount = playerCount;
    }

    public int getNodeCount() {
        return nodeCount;
    }

    public void setNodeCount(int nodeCount) {
        this.nodeCount = nodeCount;
    }

    public int getLinkCount() {
        return linkCount;
    }

    public void setLinkCount(int linkCount) {
        this.linkCount = linkCount;
    }

    public int getPacketFlowCount() {
        return packetFlowCount;
    }

    public void setPacketFlowCount(int packetFlowCount) {
        this.packetFlowCount = packetFlowCount;
    }

    public int getIncidentCount() {
        return incidentCount;
    }

    public void setIncidentCount(int incidentCount) {
        this.incidentCount = incidentCount;
    }

    public int getScoreTotal() {
        return scoreTotal;
    }

    public void setScoreTotal(int scoreTotal) {
        this.scoreTotal = scoreTotal;
    }

    public Instant getUpdatedAt() {
        return updatedAt;
    }

    public void setUpdatedAt(Instant updatedAt) {
        this.updatedAt = updatedAt;
    }

    public String getStateJson() {
        return stateJson;
    }

    public void setStateJson(String stateJson) {
        this.stateJson = stateJson;
    }
}
