package com.packetquest.service;

import com.packetquest.config.TrafficProfiles;
import com.packetquest.dto.RouteResultResponse;
import com.packetquest.dto.RouteSubmissionRequest;
import com.packetquest.exception.InvalidRouteException;
import com.packetquest.exception.SessionNotFoundException;
import com.packetquest.model.GameSession;
import com.packetquest.model.LinkStatus;
import com.packetquest.model.NetworkLink;
import com.packetquest.model.NetworkNode;
import com.packetquest.model.NodeStatus;
import com.packetquest.model.NodeType;
import com.packetquest.model.LinkType;
import com.packetquest.model.PacketFlow;
import com.packetquest.model.PacketStatus;
import com.packetquest.model.Player;
import com.packetquest.model.TrafficType;
import com.packetquest.repository.GameSessionRepository;
import org.junit.jupiter.api.Test;

import java.time.Instant;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

/**
 * Tests for the core route engine: validation, latency, congestion, delivery /
 * drop and scoring. Sessions are hand-built for full control.
 */
class RoutingServiceTest {

    /** A minimal A--link-->B scenario with one player and one VIDEO packet. */
    private static class Scenario {
        GameSessionRepository repo = new GameSessionRepository();
        RoutingService routing = new RoutingService(
                repo, new TrafficProfiles(), new ScoreCalculator(), new ThresholdPacketLossPolicy(),
                (id, state) -> { /* no-op broadcaster */ });
        GameSession session = new GameSession();
        NetworkNode a;
        NetworkNode b;
        NetworkLink link;
        Player player;
        PacketFlow packet;

        Scenario(TrafficType type, double linkCapacity, double baseLatency) {
            a = new NetworkNode("A", "Access", NodeType.RADIO_TOWER, 0, 0, 0);
            b = new NetworkNode("B", "Core", NodeType.CORE, 1, 0, 0);
            session.addNode(a);
            session.addNode(b);
            link = new NetworkLink("AB", "A", "B", LinkType.FIBRE, linkCapacity);
            link.setBaseLatencyMs(baseLatency);
            link.setCurrentLatencyMs(baseLatency);
            link.setPacketLossRate(0.001);
            session.addLink(link);
            player = session.addPlayer("Alice", "blue");
            Instant now = Instant.now();
            int size = new TrafficProfiles().profileFor(type).packetSize();
            int deadline = new TrafficProfiles().profileFor(type).deadlineSeconds();
            packet = new PacketFlow("pkt", player.getId(), "A", "B", type, size, deadline);
            packet.setCreatedAt(now);
            packet.setExpiresAt(now.plusSeconds(deadline));
            session.addPacketFlow(packet);
            session.start();
            repo.save(session);
        }

        RouteResultResponse route(List<String> path) {
            return routing.submitRoute(session.getId(),
                    new RouteSubmissionRequest(player.getId(), packet.getId(), path));
        }
    }

    private RouteSubmissionRequest req(Scenario s, List<String> path) {
        return new RouteSubmissionRequest(s.player.getId(), s.packet.getId(), path);
    }

    @Test
    void validRoute_deliversPacketAndScores() {
        Scenario s = new Scenario(TrafficType.VIDEO, 100, 4);

        RouteResultResponse result = s.route(List.of("A", "B"));

        assertThat(result.packetStatus()).isEqualTo(PacketStatus.DELIVERED);
        assertThat(result.latencyMs()).isEqualTo(4.0); // base 4, zero load
        assertThat(result.scoreDelta()).isEqualTo(120); // 90 + 30 fast - 0 - 0 - 0
        assertThat(s.player.getScore()).isEqualTo(120);
        assertThat(s.player.getDeliveredPackets()).isEqualTo(1);
        assertThat(s.packet.getStatus()).isEqualTo(PacketStatus.DELIVERED);
        assertThat(s.packet.getSelectedPath()).containsExactly("A", "B");
    }

    @Test
    void validRoute_increasesLinkLoad() {
        Scenario s = new Scenario(TrafficType.VIDEO, 100, 4); // VIDEO size 20

        s.route(List.of("A", "B"));

        assertThat(s.link.getCurrentLoad()).isEqualTo(20.0);
    }

    @Test
    void routing_updatesCongestionStatus() {
        Scenario s = new Scenario(TrafficType.VIDEO, 25, 4); // 20 / 25 = 0.8 -> BUSY

        s.route(List.of("A", "B"));

        assertThat(s.link.getStatus()).isEqualTo(LinkStatus.BUSY);
    }

    @Test
    void slowRoute_dropsPacket() {
        Scenario s = new Scenario(TrafficType.EMERGENCY, 100, 500); // 500ms >> 60ms SLA

        RouteResultResponse result = s.route(List.of("A", "B"));

        assertThat(result.packetStatus()).isEqualTo(PacketStatus.DROPPED);
        assertThat(result.scoreDelta()).isEqualTo(-100); // EMERGENCY drop penalty
        assertThat(s.player.getScore()).isEqualTo(-100);
        assertThat(s.player.getDroppedPackets()).isEqualTo(1);
    }

    @Test
    void routeLatencyUsesIncidentAdjustedCurrentLatency() {
        Scenario s = new Scenario(TrafficType.EMERGENCY, 100, 10);
        s.link.setCurrentLatencyMs(100); // e.g. weather or latency spike raised it above the 60ms SLA

        RouteResultResponse result = s.route(List.of("A", "B"));

        assertThat(result.packetStatus()).isEqualTo(PacketStatus.DROPPED);
        assertThat(result.latencyMs()).isEqualTo(100.0);
    }

    @Test
    void route_mustStartAtSource() {
        Scenario s = new Scenario(TrafficType.VIDEO, 100, 4);
        assertThatThrownBy(() -> s.route(List.of("B", "B")))
                .isInstanceOf(InvalidRouteException.class)
                .hasMessageContaining("start at the packet source");
    }

    @Test
    void route_mustEndAtDestination() {
        Scenario s = new Scenario(TrafficType.VIDEO, 100, 4);
        // add a dangling node C connected to A, route A->C (ends wrong)
        s.session.addNode(new NetworkNode("C", "Other", NodeType.EDGE, 2, 0, 0));
        NetworkLink ac = new NetworkLink("AC", "A", "C", LinkType.FIBRE, 100);
        ac.setBaseLatencyMs(4);
        s.session.addLink(ac);

        assertThatThrownBy(() -> s.route(List.of("A", "C")))
                .isInstanceOf(InvalidRouteException.class)
                .hasMessageContaining("end at the packet destination");
    }

    @Test
    void disconnectedRoute_isRejected() {
        Scenario s = new Scenario(TrafficType.VIDEO, 100, 4);
        s.session.getLinks().clear(); // remove the only link

        assertThatThrownBy(() -> s.route(List.of("A", "B")))
                .isInstanceOf(InvalidRouteException.class)
                .hasMessageContaining("not connected");
    }

    @Test
    void failedLinkRoute_isRejected() {
        Scenario s = new Scenario(TrafficType.VIDEO, 100, 4);
        s.link.setStatus(LinkStatus.FAILED);

        assertThatThrownBy(() -> s.route(List.of("A", "B")))
                .isInstanceOf(InvalidRouteException.class)
                .hasMessageContaining("FAILED");
    }

    @Test
    void failedNodeRoute_isRejected() {
        Scenario s = new Scenario(TrafficType.VIDEO, 100, 4);
        s.b.setStatus(NodeStatus.FAILED);

        assertThatThrownBy(() -> s.route(List.of("A", "B")))
                .isInstanceOf(InvalidRouteException.class)
                .hasMessageContaining("failed node");
    }

    @Test
    void cannotRouteAnotherPlayersPacket() {
        Scenario s = new Scenario(TrafficType.VIDEO, 100, 4);
        Player intruder = s.session.addPlayer("Mallory", "green");
        s.repo.save(s.session);

        assertThatThrownBy(() -> s.routing.submitRoute(s.session.getId(),
                new RouteSubmissionRequest(intruder.getId(), s.packet.getId(), List.of("A", "B"))))
                .isInstanceOf(InvalidRouteException.class)
                .hasMessageContaining("owned by another player");
    }

    @Test
    void expiredPacket_cannotBeRouted() {
        Scenario s = new Scenario(TrafficType.VIDEO, 100, 4);
        s.packet.setExpiresAt(Instant.now().minusSeconds(1));

        assertThatThrownBy(() -> s.route(List.of("A", "B")))
                .isInstanceOf(InvalidRouteException.class)
                .hasMessageContaining("expired");
    }

    @Test
    void nonPendingPacket_cannotBeRouted() {
        Scenario s = new Scenario(TrafficType.VIDEO, 100, 4);
        s.packet.setStatus(PacketStatus.DELIVERED);

        assertThatThrownBy(() -> s.route(List.of("A", "B")))
                .isInstanceOf(InvalidRouteException.class)
                .hasMessageContaining("not pending");
    }

    @Test
    void routeOnNonActiveSession_isRejected() {
        Scenario s = new Scenario(TrafficType.VIDEO, 100, 4);
        s.session.setStatus(com.packetquest.model.SessionStatus.WAITING);

        assertThatThrownBy(() -> s.route(List.of("A", "B")))
                .isInstanceOf(InvalidRouteException.class)
                .hasMessageContaining("not active");
    }

    @Test
    void routeAfterTimerEnded_isRejected() {
        Scenario s = new Scenario(TrafficType.VIDEO, 100, 4);
        s.session.setDurationSeconds(300);
        s.session.start(Instant.now().minusSeconds(400)); // remaining clamps to 0

        assertThatThrownBy(() -> s.route(List.of("A", "B")))
                .isInstanceOf(InvalidRouteException.class)
                .hasMessageContaining("timer has ended");
    }

    @Test
    void unknownSession_throwsNotFound() {
        Scenario s = new Scenario(TrafficType.VIDEO, 100, 4);
        assertThatThrownBy(() -> s.routing.submitRoute("missing",
                new RouteSubmissionRequest(s.player.getId(), s.packet.getId(), List.of("A", "B"))))
                .isInstanceOf(SessionNotFoundException.class);
    }

    @Test
    void scoreIsBackendComputed_notClientControllable() {
        // The request DTO carries no score/latency/result fields; the only way to
        // affect score is via the route, and the backend computes it deterministically.
        Scenario s = new Scenario(TrafficType.VIDEO, 100, 4);
        RouteResultResponse result = s.route(List.of("A", "B"));
        assertThat(result.scoreDelta()).isEqualTo(120);
        assertThat(s.player.getScore()).isEqualTo(result.scoreDelta());
    }
}
