package com.packetquest.model;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

/**
 * A packet job a player can route from a source node to a destination node.
 *
 * <p>{@link PacketStatus}, latency and score are backend-owned. The route
 * fields ({@link #selectedPath}, {@link #latencyMs}, {@link #scoreDelta}) are
 * placeholders for the not-yet-implemented route submission / scoring flow.
 */
public class PacketFlow {

    private String id = UUID.randomUUID().toString();
    private String ownerPlayerId;
    private String sourceNodeId;
    private String destinationNodeId;
    private TrafficType trafficType;
    private int packetSize;
    private int deadlineSeconds;
    private Instant createdAt = Instant.now();
    private Instant expiresAt;
    private PacketStatus status = PacketStatus.PENDING;

    // --- Result fields, populated by the backend when a route is resolved ---
    private List<String> selectedPath;
    private double latencyMs;
    private int scoreDelta;

    public PacketFlow() {
    }

    public PacketFlow(String id, String ownerPlayerId, String sourceNodeId, String destinationNodeId,
                      TrafficType trafficType, int packetSize, int deadlineSeconds) {
        this.id = id;
        this.ownerPlayerId = ownerPlayerId;
        this.sourceNodeId = sourceNodeId;
        this.destinationNodeId = destinationNodeId;
        this.trafficType = trafficType;
        this.packetSize = packetSize;
        this.deadlineSeconds = deadlineSeconds;
    }

    public String getId() {
        return id;
    }

    public void setId(String id) {
        this.id = id;
    }

    public String getOwnerPlayerId() {
        return ownerPlayerId;
    }

    public void setOwnerPlayerId(String ownerPlayerId) {
        this.ownerPlayerId = ownerPlayerId;
    }

    public String getSourceNodeId() {
        return sourceNodeId;
    }

    public void setSourceNodeId(String sourceNodeId) {
        this.sourceNodeId = sourceNodeId;
    }

    public String getDestinationNodeId() {
        return destinationNodeId;
    }

    public void setDestinationNodeId(String destinationNodeId) {
        this.destinationNodeId = destinationNodeId;
    }

    public TrafficType getTrafficType() {
        return trafficType;
    }

    public void setTrafficType(TrafficType trafficType) {
        this.trafficType = trafficType;
    }

    public int getPacketSize() {
        return packetSize;
    }

    public void setPacketSize(int packetSize) {
        this.packetSize = packetSize;
    }

    public int getDeadlineSeconds() {
        return deadlineSeconds;
    }

    public void setDeadlineSeconds(int deadlineSeconds) {
        this.deadlineSeconds = deadlineSeconds;
    }

    public Instant getCreatedAt() {
        return createdAt;
    }

    public void setCreatedAt(Instant createdAt) {
        this.createdAt = createdAt;
    }

    public Instant getExpiresAt() {
        return expiresAt;
    }

    public void setExpiresAt(Instant expiresAt) {
        this.expiresAt = expiresAt;
    }

    public PacketStatus getStatus() {
        return status;
    }

    public void setStatus(PacketStatus status) {
        this.status = status;
    }

    public List<String> getSelectedPath() {
        return selectedPath;
    }

    public void setSelectedPath(List<String> selectedPath) {
        this.selectedPath = selectedPath;
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
}
