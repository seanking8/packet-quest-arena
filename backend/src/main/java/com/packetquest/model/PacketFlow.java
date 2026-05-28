package com.packetquest.model;

import jakarta.persistence.*;

@Entity
@Table(name = "packet_flows")
public class PacketFlow {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "source_node_id")
    private Long sourceNodeId;

    @Column(name = "destination_node_id")
    private Long destinationNodeId;

    @Column(name = "traffic_type")
    private String trafficType; // EMERGENCY, VIDEO, IOT, CONTROL, BACKGROUND

    private String status = "PENDING"; // PENDING, DELIVERED, DROPPED

    private int bandwidth; // load this flow puts on a link when routed

    @Column(name = "actual_latency")
    private Integer actualLatency; // ms — set when the flow is delivered along a chosen path

    @ManyToOne
    @JoinColumn(name = "session_id")
    private GameSession session;

    public Long getId() { return id; }

    public Long getSourceNodeId() { return sourceNodeId; }
    public void setSourceNodeId(Long sourceNodeId) { this.sourceNodeId = sourceNodeId; }

    public Long getDestinationNodeId() { return destinationNodeId; }
    public void setDestinationNodeId(Long destinationNodeId) { this.destinationNodeId = destinationNodeId; }

    public String getTrafficType() { return trafficType; }
    public void setTrafficType(String trafficType) { this.trafficType = trafficType; }

    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }

    public int getBandwidth() { return bandwidth; }
    public void setBandwidth(int bandwidth) { this.bandwidth = bandwidth; }

    public GameSession getSession() { return session; }
    public void setSession(GameSession session) { this.session = session; }

    public Integer getActualLatency() { return actualLatency; }
    public void setActualLatency(Integer actualLatency) { this.actualLatency = actualLatency; }
}