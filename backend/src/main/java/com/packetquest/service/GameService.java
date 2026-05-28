package com.packetquest.service;

import com.packetquest.model.GameSession;
import com.packetquest.model.Player;
import com.packetquest.repository.GameSessionRepository;
import com.packetquest.repository.PlayerRepository;
import org.springframework.stereotype.Service;

@Service
public class GameService {

    private final GameSessionRepository sessionRepo;
    private final PlayerRepository playerRepo;

    public GameService(GameSessionRepository sessionRepo, PlayerRepository playerRepo) {
        this.sessionRepo = sessionRepo;
        this.playerRepo = playerRepo;
    }

    public GameSession createSession(String playerName) {
        GameSession session = sessionRepo.save(new GameSession());
        addPlayer(session, playerName);
        return session;
    }

    public GameSession joinSession(String sessionId, String playerName) {
        GameSession session = sessionRepo.findById(sessionId)
            .orElseThrow(() -> new IllegalArgumentException("Session not found"));
        addPlayer(session, playerName);
        return session;
    }

    private void addPlayer(GameSession session, String playerName) {
        Player player = new Player();
        player.setName(playerName);
        player.setSession(session);
        playerRepo.save(player);
    }
}
