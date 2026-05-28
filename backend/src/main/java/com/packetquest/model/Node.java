package com.packetquest.model;

import jakarta.persistence.*;

@Entity
@Table(name = "nodes")
public class Node {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private String name;

    private int x;
    private int y;

    @ManyToOne
    @JoinColumn(name = "session_id")
    private GameSession session;

    public Long getId() { return id; }

    public String getName() { return name; }
    public void setName(String name) { this.name = name; }

    public int getX() { return x; }
    public void setX(int x) { this.x = x; }

    public int getY() { return y; }
    public void setY(int y) { this.y = y; }

    public GameSession getSession() { return session; }
    public void setSession(GameSession session) { this.session = session; }
}