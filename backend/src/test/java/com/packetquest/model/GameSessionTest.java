package com.packetquest.model;

import org.junit.jupiter.api.Test;

import java.time.Instant;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * Unit tests for the in-memory {@link GameSession} aggregate and its members.
 * Pure POJO tests — no Spring context or database.
 */
class GameSessionTest {

    @Test
    void newSession_hasIdAndWaitingDefaults() {
        GameSession session = new GameSession();

        assertThat(session.getId()).isNotBlank();
        assertThat(session.getStatus()).isEqualTo(SessionStatus.WAITING);
        assertThat(session.getDurationSeconds()).isEqualTo(GameSession.DEFAULT_DURATION_SECONDS);
        assertThat(session.getCreatedAt()).isNotNull();
        assertThat(session.getStartedAt()).isNull();
        assertThat(session.getPlayers()).isEmpty();
        assertThat(session.getNodes()).isEmpty();
        assertThat(session.getLinks()).isEmpty();
        assertThat(session.getPacketFlows()).isEmpty();
        assertThat(session.getIncidents()).isEmpty();
    }

    @Test
    void addPlayer_registersPlayerWithDefaultCounters() {
        GameSession session = new GameSession();

        Player alice = session.addPlayer("Alice");
        session.addPlayer("Bob");

        assertThat(session.getPlayers()).hasSize(2);
        assertThat(alice.getId()).isNotBlank();
        assertThat(alice.getDisplayName()).isEqualTo("Alice");
        assertThat(alice.getScore()).isZero();
        assertThat(alice.getDeliveredPackets()).isZero();
        assertThat(alice.getDroppedPackets()).isZero();
        assertThat(session.getPlayers())
                .extracting(Player::getDisplayName)
                .containsExactly("Alice", "Bob");
    }

    @Test
    void remainingSeconds_waiting_returnsFullDuration() {
        GameSession session = new GameSession();
        session.setDurationSeconds(300);

        assertThat(session.remainingSeconds(Instant.now())).isEqualTo(300);
    }

    @Test
    void remainingSeconds_active_countsDownAndClampsAtZero() {
        GameSession session = new GameSession();
        session.setDurationSeconds(300);

        Instant base = Instant.parse("2026-05-29T10:00:00Z");
        session.start(base);

        assertThat(session.getStatus()).isEqualTo(SessionStatus.ACTIVE);
        assertThat(session.remainingSeconds(base)).isEqualTo(300);
        assertThat(session.remainingSeconds(base.plusSeconds(60))).isEqualTo(240);
        // past the deadline -> clamped, never negative
        assertThat(session.remainingSeconds(base.plusSeconds(400))).isZero();
    }

    @Test
    void remainingSeconds_completed_isZero() {
        GameSession session = new GameSession();
        session.start(Instant.parse("2026-05-29T10:00:00Z"));
        session.complete();

        assertThat(session.getStatus()).isEqualTo(SessionStatus.COMPLETED);
        assertThat(session.remainingSeconds(Instant.now())).isZero();
    }

    @Test
    void node_defaultsToHealthy_andCanBeAdded() {
        GameSession session = new GameSession();
        NetworkNode tower = new NetworkNode("n1", "Radio Tower 1", NodeType.RADIO_TOWER, 10, 20, 0);

        assertThat(tower.getStatus()).isEqualTo(NodeStatus.HEALTHY);
        assertThat(tower.getType()).isEqualTo(NodeType.RADIO_TOWER);
        assertThat(tower.getLatencyMultiplier()).isEqualTo(1.0);
        assertThat(tower.getPacketLossRate()).isZero();
        // 3D coordinates preserved for the frontend map
        assertThat(tower.getX()).isEqualTo(10);
        assertThat(tower.getY()).isEqualTo(20);
        assertThat(tower.getZ()).isZero();

        session.addNode(tower);
        assertThat(session.getNodes()).containsExactly(tower);
    }

    @Test
    void link_defaultsToHealthyAndPermanent_andCanBeAdded() {
        GameSession session = new GameSession();
        NetworkLink fibre = new NetworkLink("l1", "n1", "n2", LinkType.FIBRE, 100.0);

        assertThat(fibre.getStatus()).isEqualTo(LinkStatus.HEALTHY);
        assertThat(fibre.getLinkType()).isEqualTo(LinkType.FIBRE);
        assertThat(fibre.getCurrentLoad()).isZero();
        assertThat(fibre.getUtilisation()).isZero();
        assertThat(fibre.isTemporary()).isFalse();
        assertThat(fibre.getExpiresAt()).isNull();

        session.addLink(fibre);
        assertThat(session.getLinks()).containsExactly(fibre);
    }

    @Test
    void packetFlow_defaultsToPending() {
        PacketFlow flow = new PacketFlow("p1", "player-1", "n1", "n3",
                TrafficType.EMERGENCY, 8, 10);

        assertThat(flow.getStatus()).isEqualTo(PacketStatus.PENDING);
        assertThat(flow.getTrafficType()).isEqualTo(TrafficType.EMERGENCY);
        assertThat(flow.getPacketSize()).isEqualTo(8);
        assertThat(flow.getDeadlineSeconds()).isEqualTo(10);
        assertThat(flow.getSelectedPath()).isNull();
    }
}
