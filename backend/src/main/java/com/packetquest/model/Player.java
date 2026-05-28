package com.packetquest.model;

import jakarta.persistence.*;

@Entity
@Table(name = "players")
public class Player {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private String name;
    private int score = 0;

    @ManyToOne
    @JoinColumn(name = "session_id")
    private GameSession session;

    public Long getId() { return id; }
    public String getName() { return name; }
    public void setName(String name) { this.name = name; }
    public int getScore() { return score; }
    public void setScore(int score) { this.score = score; }
    public GameSession getSession() { return session; }
    public void setSession(GameSession session) { this.session = session; }
}
