package com.packetquest.model;

import jakarta.persistence.*;
import java.util.UUID;

@Entity
@Table(name = "game_sessions")
public class GameSession {

    @Id
    private String id = UUID.randomUUID().toString();

    @Column(name = "join_code", unique = true, length = 6)
    private String joinCode;

    private String status = "WAITING"; // WAITING, ACTIVE, FINISHED

    public String getId() { return id; }

    public String getJoinCode() { return joinCode; }
    public void setJoinCode(String joinCode) { this.joinCode = joinCode; }

    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }
}