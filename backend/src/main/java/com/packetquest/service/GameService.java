package com.packetquest.service;

import com.packetquest.dto.GameStateDto;
import com.packetquest.exception.GameRuleException;
import com.packetquest.exception.SessionNotFoundException;
import com.packetquest.model.GameSession;
import com.packetquest.model.Player;
import com.packetquest.model.SessionStatus;
import com.packetquest.repository.GameSessionRepository;
import org.springframework.stereotype.Service;

import java.util.List;

/**
 * Application service for session lifecycle, multiplayer join and state access.
 *
 * <p>Backed entirely by the in-memory {@link GameSessionRepository}; players are
 * held inside the {@link GameSession} aggregate. The backend is authoritative —
 * scores and game truth are never accepted from clients. Route submission,
 * scoring and simulator integration remain out of scope for this foundation.
 */
@Service
public class GameService {

    /** Minimum players required to start a match. */
    public static final int MIN_PLAYERS_TO_START = 2;
    /** Maximum players supported in a session (MVP). */
    public static final int MAX_PLAYERS = 4;
    /** Colours assigned to players in join order. */
    public static final List<String> PLAYER_COLORS = List.of("blue", "green", "orange", "purple");

    private final GameSessionRepository sessionRepo;
    private final TopologyFactory topologyFactory;
    private final PacketJobFactory packetJobFactory;

    public GameService(GameSessionRepository sessionRepo,
                       TopologyFactory topologyFactory,
                       PacketJobFactory packetJobFactory) {
        this.sessionRepo = sessionRepo;
        this.topologyFactory = topologyFactory;
        this.packetJobFactory = packetJobFactory;
    }

    /** Creates a new, empty session in WAITING status. */
    public GameSession createSession() {
        return sessionRepo.save(new GameSession());
    }

    /**
     * Adds a player to a WAITING session, assigning the next colour.
     *
     * @throws SessionNotFoundException if the session does not exist
     * @throws GameRuleException        if the session is not WAITING or is full
     */
    public Player joinPlayer(String sessionId, String displayName) {
        GameSession session = requireSession(sessionId);
        synchronized (session) {
            if (session.getStatus() != SessionStatus.WAITING) {
                throw new GameRuleException("Cannot join: session is " + session.getStatus()
                        + " (players may only join while WAITING)");
            }
            int currentCount = session.getPlayers().size();
            if (currentCount >= MAX_PLAYERS) {
                throw new GameRuleException("Cannot join: session is full (max " + MAX_PLAYERS + " players)");
            }
            String color = PLAYER_COLORS.get(currentCount);
            Player player = session.addPlayer(displayName, color);
            sessionRepo.save(session);
            return player;
        }
    }

    /**
     * Starts a match: builds topology, generates packet jobs, starts the clock.
     *
     * @throws SessionNotFoundException if the session does not exist
     * @throws GameRuleException        if too few players, or already started
     */
    public GameStateDto startSession(String sessionId) {
        GameSession session = requireSession(sessionId);
        synchronized (session) {
            if (session.getStatus() != SessionStatus.WAITING) {
                throw new GameRuleException("Cannot start: session is already " + session.getStatus());
            }
            if (session.getPlayers().size() < MIN_PLAYERS_TO_START) {
                throw new GameRuleException("Cannot start: need at least " + MIN_PLAYERS_TO_START
                        + " players (have " + session.getPlayers().size() + ")");
            }
            topologyFactory.populate(session);
            packetJobFactory.generateInitialJobs(session);
            session.setDurationSeconds(GameSession.DEFAULT_DURATION_SECONDS);
            session.start();
            sessionRepo.save(session);
        }
        return GameStateDto.from(session);
    }

    /** Returns the backend-owned state snapshot for a session. */
    public GameStateDto getState(String sessionId) {
        return GameStateDto.from(requireSession(sessionId));
    }

    private GameSession requireSession(String sessionId) {
        return sessionRepo.findById(sessionId)
                .orElseThrow(() -> new SessionNotFoundException(sessionId));
    }
}
