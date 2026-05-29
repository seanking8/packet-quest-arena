package com.packetquest.service;

import com.packetquest.config.TrafficProfiles;
import com.packetquest.model.GameSession;
import com.packetquest.model.IncidentEvent;
import com.packetquest.model.IncidentType;
import com.packetquest.model.LinkStatus;
import com.packetquest.model.LinkType;
import com.packetquest.model.NetworkLink;
import com.packetquest.model.PacketFlow;
import com.packetquest.model.PacketStatus;
import com.packetquest.model.Player;
import com.packetquest.model.SessionStatus;
import com.packetquest.model.TrafficType;
import com.packetquest.repository.GameSessionRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import java.time.Instant;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * Tests for the traffic tick and match lifecycle. Uses a no-op broadcaster and
 * hand-built sessions for full control.
 */
class GameTickServiceTest {

    private GameSessionRepository repo;
    private GameTickService tick;

    @BeforeEach
    void setUp() {
        repo = new GameSessionRepository();
        tick = new GameTickService(
                repo,
                new PacketFlowGenerationService(new TrafficProfiles()),
                new TrafficProfiles(),
                new ScoreCalculator(),
                (id, state) -> { /* no-op broadcaster */ });
    }

    private NetworkLink link(GameSession s, double capacity, double load) {
        NetworkLink l = new NetworkLink("AB", "A", "B", LinkType.FIBRE, capacity);
        l.setCurrentLoad(load);
        l.recomputeStatus();
        s.addLink(l);
        return l;
    }

    @Test
    void linkLoadDecays() {
        GameSession s = new GameSession();
        NetworkLink l = link(s, 100, 80);
        s.start();
        repo.save(s);

        tick.tick(s.getId());

        assertThat(l.getCurrentLoad()).isEqualTo(60.0); // 80 * 0.75
    }

    @Test
    void linkStatusChangesAfterDecay() {
        GameSession s = new GameSession();
        NetworkLink l = link(s, 100, 90); // 0.90 -> CONGESTED
        assertThat(l.getStatus()).isEqualTo(LinkStatus.CONGESTED);
        s.start();
        repo.save(s);

        tick.tick(s.getId());

        assertThat(l.getCurrentLoad()).isEqualTo(67.5); // 0.675 -> BUSY
        assertThat(l.getStatus()).isEqualTo(LinkStatus.BUSY);
    }

    @Test
    void overduePacketExpiresAndPenalisesOwner() {
        GameSession s = new GameSession();
        Player p = s.addPlayer("Alice", "blue");
        PacketFlow packet = new PacketFlow("pkt", p.getId(), "A", "B", TrafficType.VIDEO, 20, 20);
        packet.setExpiresAt(Instant.now().minusSeconds(1)); // already overdue
        s.addPacketFlow(packet);
        s.start();
        repo.save(s);

        tick.tick(s.getId());

        assertThat(packet.getStatus()).isEqualTo(PacketStatus.EXPIRED);
        assertThat(p.getScore()).isEqualTo(-60); // VIDEO drop penalty
        assertThat(p.getDroppedPackets()).isEqualTo(1);
    }

    @Test
    void expiryPenaltyAppliesOnlyOnce() {
        GameSession s = new GameSession();
        Player p = s.addPlayer("Alice", "blue");
        PacketFlow packet = new PacketFlow("pkt", p.getId(), "A", "B", TrafficType.VIDEO, 20, 20);
        packet.setExpiresAt(Instant.now().minusSeconds(1));
        s.addPacketFlow(packet);
        s.start();
        repo.save(s);

        tick.tick(s.getId());
        tick.tick(s.getId()); // second tick must not re-penalise

        assertThat(p.getScore()).isEqualTo(-60);
        assertThat(p.getDroppedPackets()).isEqualTo(1);
    }

    @Test
    void generatesNewJobsWhenPendingIsLow() {
        GameSession s = new GameSession();
        new TopologyGeneratorService().populate(s); // sources + sinks exist
        Player p = s.addPlayer("Alice", "blue");
        s.start();
        repo.save(s);
        assertThat(s.getPacketFlows()).isEmpty();

        tick.tick(s.getId());

        long pending = s.getPacketFlows().stream()
                .filter(f -> f.getOwnerPlayerId().equals(p.getId())
                        && f.getStatus() == PacketStatus.PENDING)
                .count();
        assertThat(pending).isGreaterThanOrEqualTo(PacketFlowGenerationService.MIN_PENDING_PER_PLAYER);
    }

    @Test
    void completedMatchDoesNotTickFurther() {
        GameSession s = new GameSession();
        NetworkLink l = link(s, 100, 80);
        s.setStatus(SessionStatus.COMPLETED);
        repo.save(s);

        tick.tick(s.getId());

        assertThat(l.getCurrentLoad()).isEqualTo(80.0); // unchanged
    }

    @Test
    void matchCompletesWhenTimerEnds() {
        GameSession s = new GameSession();
        s.setDurationSeconds(60);
        s.start(Instant.now().minusSeconds(120)); // remaining clamps to 0
        repo.save(s);

        tick.tick(s.getId());

        assertThat(s.getStatus()).isEqualTo(SessionStatus.COMPLETED);
    }

    @Test
    void activeMatchWithTimeLeftKeepsRunning() {
        GameSession s = new GameSession();
        s.setDurationSeconds(300);
        s.start(); // fresh
        repo.save(s);

        tick.tick(s.getId());

        assertThat(s.getStatus()).isEqualTo(SessionStatus.ACTIVE);
    }

    @Test
    void expiredIncidentRestoresAffectedLinkMetrics() {
        GameSession s = new GameSession();
        NetworkLink l = link(s, 100, 0);
        l.setBaseLatencyMs(4);
        l.setCurrentLatencyMs(80);
        l.setPacketLossRate(0.8);
        l.setStatus(LinkStatus.FAILED);
        IncidentEvent incident = new IncidentEvent(
                "inc", IncidentType.LATENCY_SPIKE, "LINK", l.getId(), 0.8, "Spike", 1);
        incident.setStartedAt(Instant.now().minusSeconds(5));
        incident.setExpiresAt(Instant.now().minusSeconds(1));
        incident.setAffectedLinkIds(java.util.List.of(l.getId()));
        s.addIncident(incident);
        s.start();
        repo.save(s);

        tick.tick(s.getId());

        assertThat(s.getIncidents()).isEmpty();
        assertThat(l.getCurrentLatencyMs()).isEqualTo(4);
        assertThat(l.getPacketLossRate()).isEqualTo(0.001);
        assertThat(l.getStatus()).isEqualTo(LinkStatus.HEALTHY);
    }
}
