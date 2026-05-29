package com.packetquest.model;

import java.util.UUID;

/**
 * A node in the network topology (radio tower, O-RAN unit, edge/core data
 * centre, satellite, etc.). Position is stored as 3D coordinates so the
 * frontend can place it on the map; the backend owns status and risk factors.
 */
public class NetworkNode {

    private String id = UUID.randomUUID().toString();
    private String name;
    private NodeType type;
    private NodeStatus status = NodeStatus.HEALTHY;
    private double x;
    private double y;
    private double z;
    /** Backend-owned probability [0..1] that a packet is lost at this node. */
    private double packetLossRate = 0.0;
    /** Backend-owned latency scaling factor (1.0 = nominal). */
    private double latencyMultiplier = 1.0;

    public NetworkNode() {
    }

    public NetworkNode(String id, String name, NodeType type, double x, double y, double z) {
        this.id = id;
        this.name = name;
        this.type = type;
        this.x = x;
        this.y = y;
        this.z = z;
    }

    public String getId() {
        return id;
    }

    public void setId(String id) {
        this.id = id;
    }

    public String getName() {
        return name;
    }

    public void setName(String name) {
        this.name = name;
    }

    public NodeType getType() {
        return type;
    }

    public void setType(NodeType type) {
        this.type = type;
    }

    public NodeStatus getStatus() {
        return status;
    }

    public void setStatus(NodeStatus status) {
        this.status = status;
    }

    public double getX() {
        return x;
    }

    public void setX(double x) {
        this.x = x;
    }

    public double getY() {
        return y;
    }

    public void setY(double y) {
        this.y = y;
    }

    public double getZ() {
        return z;
    }

    public void setZ(double z) {
        this.z = z;
    }

    public double getPacketLossRate() {
        return packetLossRate;
    }

    public void setPacketLossRate(double packetLossRate) {
        this.packetLossRate = packetLossRate;
    }

    public double getLatencyMultiplier() {
        return latencyMultiplier;
    }

    public void setLatencyMultiplier(double latencyMultiplier) {
        this.latencyMultiplier = latencyMultiplier;
    }
}
