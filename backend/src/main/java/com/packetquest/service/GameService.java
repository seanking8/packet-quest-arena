package com.packetquest.service;

import com.packetquest.dto.GameStateResponse;
import com.packetquest.dto.RouteActionRequest;
import com.packetquest.dto.SessionJoinResponse;
import com.packetquest.exception.SessionNotFoundException;
import com.packetquest.factory.PacketFlowFactory;
import com.packetquest.factory.TopologyFactory;
import com.packetquest.model.GameSession;
import com.packetquest.model.Link;
import com.packetquest.model.Node;
import com.packetquest.model.PacketFlow;
import com.packetquest.model.Player;
import com.packetquest.repository.GameSessionRepository;
import com.packetquest.repository.LinkRepository;
import com.packetquest.repository.NodeRepository;
import com.packetquest.repository.PacketFlowRepository;
import com.packetquest.repository.PlayerRepository;
import com.packetquest.service.scoring.ScoringStrategy;
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
    private final PacketFlowRepository flowRepo;
    private final TopologyFactory topologyFactory;
    private final PacketFlowFactory flowFactory;
    private final ScoringStrategy scoringStrategy;

    public GameService(GameSessionRepository sessionRepo,
                       PlayerRepository playerRepo,
                       NodeRepository nodeRepo,
                       LinkRepository linkRepo,
                       PacketFlowRepository flowRepo,
                       TopologyFactory topologyFactory,
                       PacketFlowFactory flowFactory,
                       ScoringStrategy scoringStrategy) {
        this.sessionRepo = sessionRepo;
        this.playerRepo = playerRepo;
        this.nodeRepo = nodeRepo;
        this.linkRepo = linkRepo;
        this.flowRepo = flowRepo;
        this.topologyFactory = topologyFactory;
        this.flowFactory = flowFactory;
        this.scoringStrategy = scoringStrategy;
    }

    public SessionJoinResponse createSession(String playerName) {
        GameSession session = new GameSession();
        session.setJoinCode(generateUniqueJoinCode());
        session = sessionRepo.save(session);

        Player player = addPlayer(session, playerName);
        generateTopology(session);

        return toResponse(session, player);
    }

    public SessionJoinResponse joinSession(String joinCode, String playerName) {
        GameSession session = sessionRepo.findByJoinCode(joinCode.trim().toUpperCase())
                .orElseThrow(() -> new SessionNotFoundException("Session not found"));
        Player player = addPlayer(session, playerName);
        return toResponse(session, player);
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

        List<GameStateResponse.FlowView> flows = flowRepo.findBySessionId(sessionId)
                .stream()
                .map(f -> new GameStateResponse.FlowView(
                        f.getId(), f.getSourceNodeId(), f.getDestinationNodeId(),
                        f.getTrafficType(), f.getStatus(), f.getBandwidth()))
                .toList();

        return new GameStateResponse(
                session.getId(),
                session.getStatus(),
                players,
                nodes,
                links,
                flows,
                session.getScore()
        );
    }

    /**
     * Apply a routing action: walk the path, add the flow's bandwidth to each
     * link's load along the way, record the flow's actual latency, mark it
     * DELIVERED, and recompute the session's score from the new state.
     *
     * All side effects happen inside a single @Transactional so the score is
     * always consistent with the action that produced it.
     */
    @org.springframework.transaction.annotation.Transactional
    public GameStateResponse routeFlow(String sessionId, RouteActionRequest req) {
        // Session exists (clean 404 via the exception handler)
        sessionRepo.findById(sessionId)
                .orElseThrow(() -> new SessionNotFoundException("Session not found"));

        // Player exists and belongs to this session
        Player player = playerRepo.findById(req.getPlayerId())
                .orElseThrow(() -> new IllegalArgumentException("Player not found"));
        if (player.getSession() == null
                || !sessionId.equals(player.getSession().getId())) {
            throw new IllegalArgumentException("Player does not belong to this session");
        }

        // Flow exists and is still pending
        PacketFlow flow = flowRepo.findById(req.getFlowId())
                .orElseThrow(() -> new IllegalArgumentException("Flow not found"));
        if (!"PENDING".equals(flow.getStatus())) {
            throw new IllegalStateException("Flow has already been handled");
        }

        // Path is sane and matches the flow's endpoints
        List<Long> path = req.getPath();
        if (path.size() < 2) {
            throw new IllegalArgumentException("Route must include at least two nodes");
        }
        if (!path.get(0).equals(flow.getSourceNodeId())) {
            throw new IllegalArgumentException(
                    "Path must start at the flow's source node (" + flow.getSourceNodeId() + ")");
        }
        if (!path.get(path.size() - 1).equals(flow.getDestinationNodeId())) {
            throw new IllegalArgumentException(
                    "Path must end at the flow's destination node (" + flow.getDestinationNodeId() + ")");
        }

        // Each consecutive pair must be a real link in this session
        List<Link> sessionLinks = linkRepo.findBySessionId(sessionId);
        java.util.Map<String, Link> linkByPair = new java.util.HashMap<>();
        for (Link l : sessionLinks) {
            linkByPair.put(pairKey(l.getSource(), l.getTarget()), l);
        }

        // Walk the path; bump each link's load by the flow's bandwidth and
        // accumulate the total latency along the chosen route.
        int pathLatency = 0;
        for (int i = 0; i < path.size() - 1; i++) {
            Link link = linkByPair.get(pairKey(path.get(i), path.get(i + 1)));
            if (link == null) {
                throw new IllegalArgumentException(
                        "No link between nodes " + path.get(i) + " and " + path.get(i + 1));
            }
            link.setLoad(link.getLoad() + flow.getBandwidth());
            pathLatency += link.getLatency();
            linkRepo.save(link);
        }

        flow.setStatus("DELIVERED");
        flow.setActualLatency(pathLatency);
        flowRepo.save(flow);

        // Recompute the session's score from the freshly updated state.
        // Reads the current flows and links (which include this action's effects)
        // and persists the new score on the session.
        GameSession session = sessionRepo.findById(sessionId).orElseThrow();
        List<PacketFlow> sessionFlows = flowRepo.findBySessionId(sessionId);
        List<Link> updatedLinks = linkRepo.findBySessionId(sessionId);
        session.setScore(scoringStrategy.calculate(sessionFlows, updatedLinks));
        sessionRepo.save(session);

        return getGameState(sessionId);
    }

    /** Unordered key so a link counts the same in either direction. */
    private String pairKey(Long a, Long b) {
        return a < b ? a + "-" + b : b + "-" + a;
    }

    private void generateTopology(GameSession session) {
        List<Node> nodes = nodeRepo.saveAll(topologyFactory.buildNodes(session));
        linkRepo.saveAll(topologyFactory.buildLinks(session, nodes));
        flowRepo.saveAll(flowFactory.buildFlows(session, nodes));
    }

    private Player addPlayer(GameSession session, String playerName) {
        Player player = new Player();
        player.setName(playerName);
        player.setSession(session);
        return playerRepo.save(player);
    }

    private SessionJoinResponse toResponse(GameSession session, Player player) {
        return new SessionJoinResponse(
                session.getId(),
                session.getJoinCode(),
                session.getStatus(),
                player.getId(),
                player.getName()
        );
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