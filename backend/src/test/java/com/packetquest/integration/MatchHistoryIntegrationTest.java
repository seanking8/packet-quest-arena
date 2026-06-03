package com.packetquest.integration;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.packetquest.dto.GameStateDto;
import com.packetquest.dto.MatchReportDto;
import com.packetquest.model.GameDifficulty;
import com.packetquest.model.PacketFlow;
import com.packetquest.model.PacketStatus;
import com.packetquest.model.Player;
import com.packetquest.model.SessionStatus;
import com.packetquest.model.TrafficType;
import com.packetquest.persistence.GameSessionSnapshotEntity;
import com.packetquest.persistence.GameSessionSnapshotJpaRepository;
import com.packetquest.persistence.PlayerActionAuditEntity;
import com.packetquest.persistence.PlayerActionAuditJpaRepository;
import com.packetquest.persistence.TrafficEventAuditEntity;
import com.packetquest.persistence.TrafficEventAuditJpaRepository;
import com.packetquest.service.MatchHistoryService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;

import java.time.Instant;
import java.util.List;
import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;

/** Verifies database-backed history, leaderboard, report, and timeline reads. */
@SpringBootTest(properties = "packetquest.persistence.enabled=true")
class MatchHistoryIntegrationTest {

    @Autowired
    GameSessionSnapshotJpaRepository snapshotRepo;
    @Autowired
    PlayerActionAuditJpaRepository actionRepo;
    @Autowired
    TrafficEventAuditJpaRepository eventRepo;
    @Autowired
    MatchHistoryService historyService;
    @Autowired
    ObjectMapper objectMapper;

    @BeforeEach
    void cleanDatabase() {
        actionRepo.deleteAll();
        eventRepo.deleteAll();
        snapshotRepo.deleteAll();
    }

    @Test
    void persistedRowsDriveHistoryLeaderboardReportAndTimeline() throws Exception {
        Instant finishedAt = Instant.parse("2026-06-03T12:00:00Z");
        Player alice = player("p-alice", "Alice", "#20d0be", 140, 2, 0);
        Player bob = player("p-bob", "Bob", "#ffb454", 40, 0, 1);
        PacketFlow delivered = packet("flow-1", alice.getId(), PacketStatus.DELIVERED, 92.0, 110);
        PacketFlow dropped = packet("flow-2", bob.getId(), PacketStatus.DROPPED, 410.0, -20);

        GameStateDto state = new GameStateDto(
                "match-1",
                SessionStatus.COMPLETED,
                GameDifficulty.MEDIUM,
                "CITY",
                3,
                3,
                "Storm round",
                "Final pressure",
                0,
                List.of(alice, bob),
                List.of(),
                List.of(),
                List.of(delivered, dropped),
                List.of(),
                List.of(),
                finishedAt);

        snapshotRepo.save(snapshot(state, 1, 2, 140, finishedAt));
        Player charlie = player("p-charlie", "Charlie", "#4f9dff", 900, 8, 0);
        GameStateDto easyState = new GameStateDto(
                "match-easy",
                SessionStatus.COMPLETED,
                GameDifficulty.EASY,
                "CITY",
                3,
                3,
                "Easy round",
                "Practice pace",
                0,
                List.of(charlie),
                List.of(),
                List.of(),
                List.of(),
                List.of(),
                List.of(),
                finishedAt.plusSeconds(30));
        snapshotRepo.save(snapshot(easyState, 0, 0, 900, finishedAt.plusSeconds(30)));

        actionRepo.save(routeAction("match-1", alice.getId(), delivered.getId(), PacketStatus.DELIVERED,
                92.0, 110, List.of("core-a", "edge-a", "tower-a")));
        eventRepo.save(event("match-1", "INCIDENT_APPLIED", "incident-1",
                Map.of("eventType", "FIBRE_CUT", "message", "Fibre cut on the west route.")));

        assertThat(historyService.recentMatches())
                .anySatisfy(match -> {
                    assertThat(match.sessionId()).isEqualTo("match-1");
                    assertThat(match.winnerName()).isEqualTo("Alice");
                    assertThat(match.deliveredPackets()).isEqualTo(2);
                    assertThat(match.droppedPackets()).isEqualTo(1);
                });

        assertThat(historyService.leaderboard(GameDifficulty.MEDIUM))
                .first()
                .satisfies(entry -> {
                    assertThat(entry.playerName()).isEqualTo("Alice");
                    assertThat(entry.totalScore()).isEqualTo(140);
                    assertThat(entry.wins()).isEqualTo(1);
                    assertThat(entry.matches()).isEqualTo(1);
                });
        assertThat(historyService.leaderboard(GameDifficulty.MEDIUM))
                .extracting("playerName")
                .doesNotContain("Charlie");
        assertThat(historyService.leaderboard(GameDifficulty.EASY))
                .extracting("playerName")
                .containsExactly("Charlie");

        MatchReportDto report = historyService.report("match-1");
        assertThat(report.winnerName()).isEqualTo("Alice");
        assertThat(report.routeActions()).isEqualTo(1);
        assertThat(report.incidentEvents()).isEqualTo(1);
        assertThat(report.averageLatencyMs()).isEqualTo(92.0);
        assertThat(report.timeline())
                .extracting("summary")
                .anyMatch(summary -> summary.toString().contains("routed packet"))
                .anyMatch(summary -> summary.toString().contains("Fibre cut"));
    }

    private Player player(String id, String name, String color, int score, int delivered, int dropped) {
        Player player = new Player(name, color);
        player.setId(id);
        player.setScore(score);
        player.setDeliveredPackets(delivered);
        player.setDroppedPackets(dropped);
        return player;
    }

    private PacketFlow packet(String id, String playerId, PacketStatus status, double latencyMs, int scoreDelta) {
        PacketFlow packet = new PacketFlow(id, playerId, "core-a", "tower-a", TrafficType.EMERGENCY, 180, 30);
        packet.setStatus(status);
        packet.setLatencyMs(latencyMs);
        packet.setScoreDelta(scoreDelta);
        return packet;
    }

    private GameSessionSnapshotEntity snapshot(GameStateDto state, int incidents, int packets,
                                               int scoreTotal, Instant updatedAt) throws JsonProcessingException {
        GameSessionSnapshotEntity snapshot = new GameSessionSnapshotEntity();
        snapshot.setSessionId(state.sessionId());
        snapshot.setStatus(state.status());
        snapshot.setDifficulty(state.difficulty());
        snapshot.setMapFamily(state.mapFamily());
        snapshot.setCurrentRound(state.currentRound());
        snapshot.setPlayerCount(state.players().size());
        snapshot.setNodeCount(state.nodes().size());
        snapshot.setLinkCount(state.links().size());
        snapshot.setPacketFlowCount(packets);
        snapshot.setIncidentCount(incidents);
        snapshot.setScoreTotal(scoreTotal);
        snapshot.setUpdatedAt(updatedAt);
        snapshot.setStateJson(objectMapper.writeValueAsString(state));
        return snapshot;
    }

    private PlayerActionAuditEntity routeAction(String sessionId, String playerId, String packetId,
                                                PacketStatus result, double latencyMs, int scoreDelta,
                                                List<String> path) throws JsonProcessingException {
        PlayerActionAuditEntity action = new PlayerActionAuditEntity();
        action.setSessionId(sessionId);
        action.setPlayerId(playerId);
        action.setPacketFlowId(packetId);
        action.setActionType("ROUTE");
        action.setPathJson(objectMapper.writeValueAsString(path));
        action.setResultStatus(result);
        action.setLatencyMs(latencyMs);
        action.setScoreDelta(scoreDelta);
        action.setCreatedAt(Instant.parse("2026-06-03T11:59:20Z"));
        return action;
    }

    private TrafficEventAuditEntity event(String sessionId, String type, String subjectId,
                                          Map<String, Object> payload) throws JsonProcessingException {
        TrafficEventAuditEntity event = new TrafficEventAuditEntity();
        event.setSessionId(sessionId);
        event.setEventType(type);
        event.setSubjectId(subjectId);
        event.setPayloadJson(objectMapper.writeValueAsString(payload));
        event.setCreatedAt(Instant.parse("2026-06-03T11:59:40Z"));
        return event;
    }
}
