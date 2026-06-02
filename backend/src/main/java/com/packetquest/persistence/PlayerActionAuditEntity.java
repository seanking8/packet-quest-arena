package com.packetquest.persistence;

import com.packetquest.model.PacketStatus;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Lob;
import jakarta.persistence.Table;

import java.time.Instant;

/** Records each player action submitted to the authoritative backend. */
@Entity
@Table(name = "player_action_audit")
public class PlayerActionAuditEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private String sessionId;
    private String playerId;
    private String packetFlowId;
    private String actionType;

    @Lob
    @Column(columnDefinition = "LONGTEXT")
    private String pathJson;

    @Enumerated(EnumType.STRING)
    private PacketStatus resultStatus;

    private double latencyMs;
    private int scoreDelta;
    private Instant createdAt;

    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public String getSessionId() {
        return sessionId;
    }

    public void setSessionId(String sessionId) {
        this.sessionId = sessionId;
    }

    public String getPlayerId() {
        return playerId;
    }

    public void setPlayerId(String playerId) {
        this.playerId = playerId;
    }

    public String getPacketFlowId() {
        return packetFlowId;
    }

    public void setPacketFlowId(String packetFlowId) {
        this.packetFlowId = packetFlowId;
    }

    public String getActionType() {
        return actionType;
    }

    public void setActionType(String actionType) {
        this.actionType = actionType;
    }

    public String getPathJson() {
        return pathJson;
    }

    public void setPathJson(String pathJson) {
        this.pathJson = pathJson;
    }

    public PacketStatus getResultStatus() {
        return resultStatus;
    }

    public void setResultStatus(PacketStatus resultStatus) {
        this.resultStatus = resultStatus;
    }

    public double getLatencyMs() {
        return latencyMs;
    }

    public void setLatencyMs(double latencyMs) {
        this.latencyMs = latencyMs;
    }

    public int getScoreDelta() {
        return scoreDelta;
    }

    public void setScoreDelta(int scoreDelta) {
        this.scoreDelta = scoreDelta;
    }

    public Instant getCreatedAt() {
        return createdAt;
    }

    public void setCreatedAt(Instant createdAt) {
        this.createdAt = createdAt;
    }
}
