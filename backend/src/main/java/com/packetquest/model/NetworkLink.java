package com.packetquest.model;

import java.time.Instant;
import java.util.UUID;

/**
 * A connection between two {@link NetworkNode}s.
 *
 * <p>Link load and the derived {@link LinkStatus} are owned by the backend; the
 * frontend must never compute or submit link load. {@code temporary} links
 * (e.g. future player-deployed satellite relays) carry a creator and expiry.
 */
public class NetworkLink {

    private String id = UUID.randomUUID().toString();
    private String sourceNodeId;
    private String targetNodeId;
    private LinkType linkType;
    private LinkStatus status = LinkStatus.HEALTHY;
    private double capacity;
    private double currentLoad = 0.0;
    private double baseLatencyMs = 0.0;
    private double currentLatencyMs = 0.0;
    private double packetLossRate = 0.0;
    private boolean temporary = false;
    private String createdByPlayerId;
    private Instant expiresAt;

    public NetworkLink() {
    }

    public NetworkLink(String id, String sourceNodeId, String targetNodeId, LinkType linkType, double capacity) {
        this.id = id;
        this.sourceNodeId = sourceNodeId;
        this.targetNodeId = targetNodeId;
        this.linkType = linkType;
        this.capacity = capacity;
    }

    /** Utilisation as a fraction of capacity (0.0 when capacity is unset). */
    public double getUtilisation() {
        return capacity > 0 ? currentLoad / capacity : 0.0;
    }

    public String getId() {
        return id;
    }

    public void setId(String id) {
        this.id = id;
    }

    public String getSourceNodeId() {
        return sourceNodeId;
    }

    public void setSourceNodeId(String sourceNodeId) {
        this.sourceNodeId = sourceNodeId;
    }

    public String getTargetNodeId() {
        return targetNodeId;
    }

    public void setTargetNodeId(String targetNodeId) {
        this.targetNodeId = targetNodeId;
    }

    public LinkType getLinkType() {
        return linkType;
    }

    public void setLinkType(LinkType linkType) {
        this.linkType = linkType;
    }

    public LinkStatus getStatus() {
        return status;
    }

    public void setStatus(LinkStatus status) {
        this.status = status;
    }

    public double getCapacity() {
        return capacity;
    }

    public void setCapacity(double capacity) {
        this.capacity = capacity;
    }

    public double getCurrentLoad() {
        return currentLoad;
    }

    public void setCurrentLoad(double currentLoad) {
        this.currentLoad = currentLoad;
    }

    public double getBaseLatencyMs() {
        return baseLatencyMs;
    }

    public void setBaseLatencyMs(double baseLatencyMs) {
        this.baseLatencyMs = baseLatencyMs;
    }

    public double getCurrentLatencyMs() {
        return currentLatencyMs;
    }

    public void setCurrentLatencyMs(double currentLatencyMs) {
        this.currentLatencyMs = currentLatencyMs;
    }

    public double getPacketLossRate() {
        return packetLossRate;
    }

    public void setPacketLossRate(double packetLossRate) {
        this.packetLossRate = packetLossRate;
    }

    public boolean isTemporary() {
        return temporary;
    }

    public void setTemporary(boolean temporary) {
        this.temporary = temporary;
    }

    public String getCreatedByPlayerId() {
        return createdByPlayerId;
    }

    public void setCreatedByPlayerId(String createdByPlayerId) {
        this.createdByPlayerId = createdByPlayerId;
    }

    public Instant getExpiresAt() {
        return expiresAt;
    }

    public void setExpiresAt(Instant expiresAt) {
        this.expiresAt = expiresAt;
    }
}
