package com.packetquest.dto;

public class SessionJoinResponse {
    private final String sessionId;
    private final String joinCode;
    private final String status;
    private final Long playerId;
    private final String playerName;

    public SessionJoinResponse(String sessionId, String joinCode, String status,
                               Long playerId, String playerName) {
        this.sessionId = sessionId;
        this.joinCode = joinCode;
        this.status = status;
        this.playerId = playerId;
        this.playerName = playerName;
    }

    public String getSessionId() { return sessionId; }
    public String getJoinCode() { return joinCode; }
    public String getStatus() { return status; }
    public Long getPlayerId() { return playerId; }
    public String getPlayerName() { return playerName; }
}