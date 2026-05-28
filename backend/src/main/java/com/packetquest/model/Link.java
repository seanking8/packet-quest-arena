package com.packetquest.model;

import jakarta.persistence.*;

@Entity
@Table(name = "links")
public class Link {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    // IDs of the two nodes this link connects
    @Column(name = "source_node_id")
    private Long source;

    @Column(name = "target_node_id")
    private Long target;

    private int capacity;
    private int latency;   // milliseconds
    @Column(name = "link_load")
    private int load;
    private String status = "UP"; // UP, DEGRADED, DOWN

    @ManyToOne
    @JoinColumn(name = "session_id")
    private GameSession session;

    public Long getId() { return id; }

    public Long getSource() { return source; }
    public void setSource(Long source) { this.source = source; }

    public Long getTarget() { return target; }
    public void setTarget(Long target) { this.target = target; }

    public int getCapacity() { return capacity; }
    public void setCapacity(int capacity) { this.capacity = capacity; }

    public int getLatency() { return latency; }
    public void setLatency(int latency) { this.latency = latency; }

    public int getLoad() { return load; }
    public void setLoad(int load) { this.load = load; }

    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }

    public GameSession getSession() { return session; }
    public void setSession(GameSession session) { this.session = session; }
}