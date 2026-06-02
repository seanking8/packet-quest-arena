package com.packetquest.integration;

import com.packetquest.dto.RouteResultResponse;
import com.packetquest.dto.RouteSubmissionRequest;
import com.packetquest.model.GameDifficulty;
import com.packetquest.model.GameSession;
import com.packetquest.model.NetworkLink;
import com.packetquest.model.PacketFlow;
import com.packetquest.model.PacketStatus;
import com.packetquest.model.Player;
import com.packetquest.persistence.GameSessionSnapshotEntity;
import com.packetquest.persistence.GameSessionSnapshotJpaRepository;
import com.packetquest.persistence.PlayerActionAuditEntity;
import com.packetquest.persistence.PlayerActionAuditJpaRepository;
import com.packetquest.persistence.TrafficEventAuditEntity;
import com.packetquest.persistence.TrafficEventAuditJpaRepository;
import com.packetquest.repository.GameSessionRepository;
import com.packetquest.service.GameService;
import com.packetquest.service.RoutingService;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;

import java.util.ArrayDeque;
import java.util.ArrayList;
import java.util.Deque;
import java.util.HashMap;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;

import static org.assertj.core.api.Assertions.assertThat;

/** Verifies the MySQL-facing persistence layer using the H2 test database. */
@SpringBootTest(properties = "packetquest.persistence.enabled=true")
class PersistenceIntegrationTest {

    @Autowired
    GameService gameService;
    @Autowired
    RoutingService routingService;
    @Autowired
    GameSessionRepository sessionRepo;
    @Autowired
    GameSessionSnapshotJpaRepository snapshotRepo;
    @Autowired
    PlayerActionAuditJpaRepository actionRepo;
    @Autowired
    TrafficEventAuditJpaRepository eventRepo;

    @Test
    void sessionSnapshotsAndRouteAuditsArePersisted() {
        GameSession created = gameService.createSession(GameDifficulty.EASY);
        Player alice = gameService.joinPlayer(created.getId(), "Alice");
        gameService.joinPlayer(created.getId(), "Bob");
        gameService.startSession(created.getId(), "CITY");

        GameSession started = sessionRepo.findById(created.getId()).orElseThrow();
        GameSessionSnapshotEntity startSnapshot = snapshotRepo.findById(created.getId()).orElseThrow();
        assertThat(startSnapshot.getPlayerCount()).isEqualTo(2);
        assertThat(startSnapshot.getNodeCount()).isGreaterThan(0);
        assertThat(startSnapshot.getLinkCount()).isGreaterThan(0);
        assertThat(startSnapshot.getPacketFlowCount()).isGreaterThan(0);
        assertThat(startSnapshot.getStateJson()).contains("packetFlows", "players", "links");

        PacketFlow packet = started.getPacketFlows().stream()
                .filter(p -> p.getOwnerPlayerId().equals(alice.getId()))
                .filter(p -> p.getStatus() == PacketStatus.PENDING)
                .findFirst()
                .orElseThrow();
        List<String> path = shortestPath(started.getLinks(), packet.getSourceNodeId(), packet.getDestinationNodeId());
        assertThat(path).isNotNull();

        RouteResultResponse result = routingService.submitRoute(created.getId(),
                new RouteSubmissionRequest(alice.getId(), packet.getId(), path));

        List<PlayerActionAuditEntity> actions = actionRepo.findBySessionIdOrderByCreatedAtAsc(created.getId());
        assertThat(actions).hasSize(1);
        PlayerActionAuditEntity action = actions.get(0);
        assertThat(action.getActionType()).isEqualTo("ROUTE");
        assertThat(action.getPlayerId()).isEqualTo(alice.getId());
        assertThat(action.getPacketFlowId()).isEqualTo(packet.getId());
        assertThat(action.getPathJson()).contains(path.get(0), path.get(path.size() - 1));
        assertThat(action.getResultStatus()).isEqualTo(result.packetStatus());
        assertThat(action.getScoreDelta()).isEqualTo(result.scoreDelta());

        List<TrafficEventAuditEntity> events = eventRepo.findBySessionIdOrderByCreatedAtAsc(created.getId());
        assertThat(events).anyMatch(e -> e.getEventType().startsWith("PACKET_")
                && packet.getId().equals(e.getSubjectId()));

        GameSessionSnapshotEntity finalSnapshot = snapshotRepo.findById(created.getId()).orElseThrow();
        assertThat(finalSnapshot.getScoreTotal()).isEqualTo(result.state().players().stream()
                .mapToInt(Player::getScore)
                .sum());
    }

    private static List<String> shortestPath(List<NetworkLink> links, String from, String to) {
        Map<String, List<String>> adj = new HashMap<>();
        for (NetworkLink link : links) {
            adj.computeIfAbsent(link.getSourceNodeId(), key -> new ArrayList<>()).add(link.getTargetNodeId());
            adj.computeIfAbsent(link.getTargetNodeId(), key -> new ArrayList<>()).add(link.getSourceNodeId());
        }
        Deque<List<String>> queue = new ArrayDeque<>();
        queue.add(List.of(from));
        Set<String> seen = new HashSet<>();
        seen.add(from);
        while (!queue.isEmpty()) {
            List<String> path = queue.poll();
            String tail = path.get(path.size() - 1);
            if (tail.equals(to)) {
                return path;
            }
            for (String next : adj.getOrDefault(tail, List.of())) {
                if (seen.add(next)) {
                    List<String> extended = new ArrayList<>(path);
                    extended.add(next);
                    queue.add(extended);
                }
            }
        }
        return null;
    }
}
