package com.packetquest.service;

import com.packetquest.model.GameSession;
import com.packetquest.model.Player;
import com.packetquest.repository.GameSessionRepository;
import com.packetquest.repository.PlayerRepository;
import org.springframework.stereotype.Service;

import java.security.SecureRandom;

@Service
public class GameService {

    // No easily-confused characters (no O/0, I/1, L)
    private static final String CODE_CHARS = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
    private static final int CODE_LENGTH = 6;
    private final SecureRandom random = new SecureRandom();

    private final GameSessionRepository sessionRepo;
    private final PlayerRepository playerRepo;

    public GameService(GameSessionRepository sessionRepo, PlayerRepository playerRepo) {
        this.sessionRepo = sessionRepo;
        this.playerRepo = playerRepo;
    }

    public GameSession createSession(String playerName) {
        GameSession session = new GameSession();
        session.setJoinCode(generateUniqueJoinCode());
        session = sessionRepo.save(session);
        addPlayer(session, playerName);
        return session;
    }

    public GameSession joinSession(String joinCode, String playerName) {
        GameSession session = sessionRepo.findByJoinCode(joinCode.trim().toUpperCase())
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

    private String generateUniqueJoinCode() {
        String code;
        do {
            code = randomCode();
        } while (sessionRepo.existsByJoinCode(code));
        return code;
    }

    private String randomCode() {
        StringBuilder sb = new StringBuilder(CODE_LENGTH);
        for (int i = 0; i < CODE_LENGTH; i++) {
            sb.append(CODE_CHARS.charAt(random.nextInt(CODE_CHARS.length())));
        }
        return sb.toString();
    }
}