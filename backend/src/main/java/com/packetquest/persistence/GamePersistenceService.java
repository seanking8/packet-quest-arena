package com.packetquest.persistence;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.packetquest.dto.GameStateDto;
import com.packetquest.dto.RouteSubmissionRequest;
import com.packetquest.model.GameSession;
import com.packetquest.model.PacketStatus;
import com.packetquest.model.Player;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.stereotype.Service;

import java.time.Instant;

/**
 * Persists assessor-visible database records without making the live game loop
 * depend on ORM-managed aggregates.
 */
@Service
@ConditionalOnProperty(name = "packetquest.persistence.enabled", havingValue = "true", matchIfMissing = true)
public class GamePersistenceService {

    private static final Logger log = LoggerFactory.getLogger(GamePersistenceService.class);

    private final GameSessionSnapshotJpaRepository snapshotRepo;
    private final PlayerActionAuditJpaRepository actionRepo;
    private final TrafficEventAuditJpaRepository eventRepo;
    private final ObjectMapper objectMapper;

    public GamePersistenceService(GameSessionSnapshotJpaRepository snapshotRepo,
                                  PlayerActionAuditJpaRepository actionRepo,
                                  TrafficEventAuditJpaRepository eventRepo,
                                  ObjectMapper objectMapper) {
        this.snapshotRepo = snapshotRepo;
        this.actionRepo = actionRepo;
        this.eventRepo = eventRepo;
        this.objectMapper = objectMapper;
    }

    public void saveSnapshot(GameSession session) {
        try {
            GameStateDto state = GameStateDto.from(session);
            GameSessionSnapshotEntity snapshot = snapshotRepo.findById(session.getId())
                    .orElseGet(GameSessionSnapshotEntity::new);
            snapshot.setSessionId(session.getId());
            snapshot.setStatus(session.getStatus());
            snapshot.setDifficulty(session.getDifficulty());
            snapshot.setMapFamily(session.getMapFamily());
            snapshot.setCurrentRound(session.getCurrentRound());
            snapshot.setPlayerCount(session.getPlayers().size());
            snapshot.setNodeCount(session.getNodes().size());
            snapshot.setLinkCount(session.getLinks().size());
            snapshot.setPacketFlowCount(session.getPacketFlows().size());
            snapshot.setIncidentCount(session.getIncidents().size());
            snapshot.setScoreTotal(session.getPlayers().stream().mapToInt(Player::getScore).sum());
            snapshot.setUpdatedAt(state.serverTime());
            snapshot.setStateJson(objectMapper.writeValueAsString(state));
            snapshotRepo.save(snapshot);
        } catch (RuntimeException | JsonProcessingException ex) {
            log.warn("Could not persist snapshot for session {}", session.getId(), ex);
        }
    }

    public void recordRouteAction(String sessionId, RouteSubmissionRequest request,
                                  PacketStatus resultStatus, double latencyMs, int scoreDelta) {
        try {
            PlayerActionAuditEntity action = new PlayerActionAuditEntity();
            action.setSessionId(sessionId);
            action.setPlayerId(request.playerId());
            action.setPacketFlowId(request.packetFlowId());
            action.setActionType("ROUTE");
            action.setPathJson(objectMapper.writeValueAsString(request.path()));
            action.setResultStatus(resultStatus);
            action.setLatencyMs(latencyMs);
            action.setScoreDelta(scoreDelta);
            action.setCreatedAt(Instant.now());
            actionRepo.save(action);
        } catch (RuntimeException | JsonProcessingException ex) {
            log.warn("Could not persist route action for session {}", sessionId, ex);
        }
    }

    public void recordEvent(String sessionId, String eventType, String subjectId, Object payload) {
        try {
            TrafficEventAuditEntity event = new TrafficEventAuditEntity();
            event.setSessionId(sessionId);
            event.setEventType(eventType);
            event.setSubjectId(subjectId);
            event.setPayloadJson(objectMapper.writeValueAsString(payload));
            event.setCreatedAt(Instant.now());
            eventRepo.save(event);
        } catch (RuntimeException | JsonProcessingException ex) {
            log.warn("Could not persist {} event for session {}", eventType, sessionId, ex);
        }
    }
}
