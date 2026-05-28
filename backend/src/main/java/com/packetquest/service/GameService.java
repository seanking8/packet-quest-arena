package com.packetquest.service;

import com.packetquest.dto.GameStateResponse;
import com.packetquest.exception.SessionNotFoundException;
import com.packetquest.factory.TopologyFactory;
import com.packetquest.model.GameSession;
import com.packetquest.model.Link;
import com.packetquest.model.Node;
import com.packetquest.model.Player;
import com.packetquest.repository.GameSessionRepository;
import com.packetquest.repository.LinkRepository;
import com.packetquest.repository.NodeRepository;
import com.packetquest.repository.PlayerRepository;
import org.springframework.stereotype.Service;

import java.security.SecureRandom;
import java.util.List;

@Service
public class GameService {

    private static final String CODE_CHARS = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
    private static final int CODE_LENGTH = 6;
    private final SecureRandom random = new SecureRandom();

    private final GameSessionRepository sessionRepo;
    private final PlayerRepository playerRepo;
    private final NodeRepository nodeRepo;
    private final LinkRepository linkRepo;
    private final TopologyFactory topologyFactory;

    public GameService(GameSessionRepository sessionRepo,
                       PlayerRepository playerRepo,
                       NodeRepository nodeRepo,
                       LinkRepository linkRepo,
                       TopologyFactory topologyFactory) {
        this.sessionRepo = sessionRepo;
        this.playerRepo = playerRepo;
        this.nodeRepo = nodeRepo;
        this.linkRepo = linkRepo;
        this.topologyFactory = topologyFactory;
    }

    public GameSession createSession(String playerName) {
        GameSession session = new GameSession();
        session.setJoinCode(generateUniqueJoinCode());
        session = sessionRepo.save(session);

        addPlayer(session, playerName);
        generateTopology(session);

        return session;
    }

    public GameSession joinSession(String joinCode, String playerName) {
        GameSession session = sessionRepo.findByJoinCode(joinCode.trim().toUpperCase())
                .orElseThrow(() -> new SessionNotFoundException("Session not found"));
        addPlayer(session, playerName);
        return session;
    }

    public GameStateResponse getGameState(String sessionId) {
        GameSession session = sessionRepo.findById(sessionId)
                .orElseThrow(() -> new SessionNotFoundException("Session not found"));

        List<GameStateResponse.PlayerView> players = playerRepo.findBySessionId(sessionId)
                .stream()
                .map(p -> new GameStateResponse.PlayerView(p.getId(), p.getName()))
                .toList();

        List<GameStateResponse.NodeView> nodes = nodeRepo.findBySessionId(sessionId)
                .stream()
                .map(n -> new GameStateResponse.NodeView(
                        n.getId(), n.getName(), n.getX(), n.getY()))
                .toList();

        List<GameStateResponse.LinkView> links = linkRepo.findBySessionId(sessionId)
                .stream()
                .map(l -> new GameStateResponse.LinkView(
                        l.getId(), l.getSource(), l.getTarget(),
                        l.getCapacity(), l.getLatency(), l.getLoad(), l.getStatus()))
                .toList();

        return new GameStateResponse(
                session.getId(),
                session.getStatus(),
                players,
                nodes,
                links,
                List.of(),   // flows: empty until the packet-traffic story
                0            // score: 0 until the scoring story
        );
    }

    private void generateTopology(GameSession session) {
        List<Node> nodes = nodeRepo.saveAll(topologyFactory.buildNodes(session));
        linkRepo.saveAll(topologyFactory.buildLinks(session, nodes));
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