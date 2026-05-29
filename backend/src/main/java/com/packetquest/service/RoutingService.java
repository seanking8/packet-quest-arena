package com.packetquest.service;

import com.packetquest.config.TrafficProfile;
import com.packetquest.config.TrafficProfiles;
import com.packetquest.dto.GameStateDto;
import com.packetquest.dto.RouteResultResponse;
import com.packetquest.dto.RouteSubmissionRequest;
import com.packetquest.exception.InvalidRouteException;
import com.packetquest.exception.SessionNotFoundException;
import com.packetquest.model.GameSession;
import com.packetquest.model.IncidentEvent;
import com.packetquest.model.LinkStatus;
import com.packetquest.model.NetworkLink;
import com.packetquest.model.NetworkNode;
import com.packetquest.model.NodeStatus;
import com.packetquest.model.PacketFlow;
import com.packetquest.model.PacketStatus;
import com.packetquest.model.Player;
import com.packetquest.model.SessionStatus;
import com.packetquest.repository.GameSessionRepository;
import org.springframework.stereotype.Service;

import java.time.Instant;
import java.util.ArrayList;
import java.util.List;

/**
 * The core game engine: validates a submitted route, computes latency, updates
 * shared link load and congestion, decides delivery/drop, and applies scoring.
 *
 * <p>The backend is authoritative — the client supplies only player, packet and
 * path; score/latency/result/link-load are computed here and never accepted
 * from the client.
 */
@Service
public class RoutingService {

    // Latency added per link by its (pre-route) congestion status, in ms.
    private static final double BUSY_LATENCY = 10;
    private static final double CONGESTED_LATENCY = 35;
    private static final double OVERLOADED_LATENCY = 80;

    // Loss risk contributed per link by its (pre-route) congestion status.
    private static final double BUSY_LOSS = 0.05;
    private static final double CONGESTED_LOSS = 0.20;
    private static final double OVERLOADED_LOSS = 0.60;

    // Latency added per active incident targeting a link, scaled by severity.
    private static final double INCIDENT_LATENCY_PER_SEVERITY = 25;

    private final GameSessionRepository sessionRepo;
    private final TrafficProfiles trafficProfiles;
    private final ScoreCalculator scoreCalculator;
    private final PacketLossPolicy packetLossPolicy;
    private final GameStateBroadcaster broadcaster;

    public RoutingService(GameSessionRepository sessionRepo,
                          TrafficProfiles trafficProfiles,
                          ScoreCalculator scoreCalculator,
                          PacketLossPolicy packetLossPolicy,
                          GameStateBroadcaster broadcaster) {
        this.sessionRepo = sessionRepo;
        this.trafficProfiles = trafficProfiles;
        this.scoreCalculator = scoreCalculator;
        this.packetLossPolicy = packetLossPolicy;
        this.broadcaster = broadcaster;
    }

    public RouteResultResponse submitRoute(String sessionId, RouteSubmissionRequest request) {
        GameSession session = sessionRepo.findById(sessionId)
                .orElseThrow(() -> new SessionNotFoundException(sessionId));

        synchronized (session) {
            Instant now = Instant.now();
            requireActiveSession(session, now);

            Player player = requirePlayer(session, request.playerId());
            PacketFlow packet = requirePacket(session, request.packetFlowId());
            requireRoutablePacket(packet, player, now);

            List<String> path = request.path();
            requireValidPathShape(path, packet);
            List<NetworkNode> nodes = resolveNodes(session, path);
            List<NetworkLink> links = resolveLinks(session, path);

            // Capture pre-route statuses; compute latency on pre-route state.
            List<LinkStatus> preStatuses = links.stream().map(NetworkLink::getStatus).toList();
            double latencyMs = computeLatency(session, links, nodes);
            double lossRisk = computeLossRisk(links, preStatuses);

            // Routing consumes capacity on every link, regardless of outcome.
            applyLoad(links, packet.getPacketSize());

            TrafficProfile profile = trafficProfiles.profileFor(packet.getTrafficType());
            int hops = path.size() - 1;

            PacketStatus outcome;
            int scoreDelta;
            String message;
            if (latencyMs > profile.slaLatencyMs()) {
                outcome = PacketStatus.DROPPED;
                scoreDelta = scoreCalculator.dropScore(profile);
                message = String.format("Packet dropped: latency %.0fms exceeded the %dms SLA.",
                        latencyMs, profile.slaLatencyMs());
            } else if (packetLossPolicy.isLost(lossRisk)) {
                outcome = PacketStatus.DROPPED;
                scoreDelta = scoreCalculator.dropScore(profile);
                message = "Packet dropped: packet loss on a congested/lossy route.";
            } else {
                outcome = PacketStatus.DELIVERED;
                scoreDelta = scoreCalculator.deliveryScore(profile, latencyMs, hops, preStatuses, lossRisk);
                message = String.format("Packet delivered in %.0fms.", latencyMs);
            }

            packet.setSelectedPath(List.copyOf(path));
            packet.setLatencyMs(latencyMs);
            packet.setStatus(outcome);
            packet.setScoreDelta(scoreDelta);
            player.addScore(scoreDelta);
            if (outcome == PacketStatus.DELIVERED) {
                player.setDeliveredPackets(player.getDeliveredPackets() + 1);
            } else {
                player.setDroppedPackets(player.getDroppedPackets() + 1);
            }

            sessionRepo.save(session);
            GameStateDto state = GameStateDto.from(session, now);
            broadcaster.broadcast(sessionId, state);
            return new RouteResultResponse(message, outcome, latencyMs, scoreDelta, state);
        }
    }

    // --- Validation --------------------------------------------------------

    private void requireActiveSession(GameSession session, Instant now) {
        if (session.getStatus() != SessionStatus.ACTIVE) {
            throw new InvalidRouteException("Session is not active (status " + session.getStatus() + ").");
        }
        if (session.remainingSeconds(now) <= 0) {
            throw new InvalidRouteException("The match timer has ended.");
        }
    }

    private Player requirePlayer(GameSession session, String playerId) {
        return session.getPlayers().stream()
                .filter(p -> p.getId().equals(playerId))
                .findFirst()
                .orElseThrow(() -> new InvalidRouteException("Player not in session: " + playerId));
    }

    private PacketFlow requirePacket(GameSession session, String packetFlowId) {
        return session.getPacketFlows().stream()
                .filter(p -> p.getId().equals(packetFlowId))
                .findFirst()
                .orElseThrow(() -> new InvalidRouteException("Packet not found: " + packetFlowId));
    }

    private void requireRoutablePacket(PacketFlow packet, Player player, Instant now) {
        if (!packet.getOwnerPlayerId().equals(player.getId())) {
            throw new InvalidRouteException("Packet is owned by another player.");
        }
        if (packet.getStatus() != PacketStatus.PENDING) {
            throw new InvalidRouteException("Packet is not pending (status " + packet.getStatus() + ").");
        }
        if (packet.getExpiresAt() != null && now.isAfter(packet.getExpiresAt())) {
            throw new InvalidRouteException("Packet has already expired.");
        }
    }

    private void requireValidPathShape(List<String> path, PacketFlow packet) {
        if (path == null || path.size() < 2) {
            throw new InvalidRouteException("Path must contain at least 2 nodes.");
        }
        if (!path.get(0).equals(packet.getSourceNodeId())) {
            throw new InvalidRouteException("Path must start at the packet source node.");
        }
        if (!path.get(path.size() - 1).equals(packet.getDestinationNodeId())) {
            throw new InvalidRouteException("Path must end at the packet destination node.");
        }
    }

    private List<NetworkNode> resolveNodes(GameSession session, List<String> path) {
        List<NetworkNode> nodes = new ArrayList<>(path.size());
        for (String nodeId : path) {
            NetworkNode node = session.getNodes().stream()
                    .filter(n -> n.getId().equals(nodeId))
                    .findFirst()
                    .orElseThrow(() -> new InvalidRouteException("Path references unknown node: " + nodeId));
            if (node.getStatus() == NodeStatus.FAILED) {
                throw new InvalidRouteException("Path uses a failed node: " + nodeId);
            }
            nodes.add(node);
        }
        return nodes;
    }

    private List<NetworkLink> resolveLinks(GameSession session, List<String> path) {
        List<NetworkLink> links = new ArrayList<>(path.size() - 1);
        for (int i = 0; i < path.size() - 1; i++) {
            String a = path.get(i);
            String b = path.get(i + 1);
            NetworkLink link = findLink(session, a, b)
                    .orElseThrow(() -> new InvalidRouteException(
                            "Nodes are not connected: " + a + " -> " + b));
            if (link.getStatus() == LinkStatus.FAILED || link.getStatus() == LinkStatus.EXPIRED) {
                throw new InvalidRouteException(
                        "Path uses a " + link.getStatus() + " link: " + link.getId());
            }
            links.add(link);
        }
        return links;
    }

    private java.util.Optional<NetworkLink> findLink(GameSession session, String a, String b) {
        return session.getLinks().stream()
                .filter(l -> (l.getSourceNodeId().equals(a) && l.getTargetNodeId().equals(b))
                        || (l.getSourceNodeId().equals(b) && l.getTargetNodeId().equals(a)))
                .findFirst();
    }

    // --- Latency / congestion / loss --------------------------------------

    private double computeLatency(GameSession session, List<NetworkLink> links, List<NetworkNode> nodes) {
        double total = 0;
        for (NetworkLink link : links) {
            double effectiveLatency = link.getCurrentLatencyMs() > 0
                    ? link.getCurrentLatencyMs()
                    : link.getBaseLatencyMs();
            double loadPenalty = effectiveLatency * link.getUtilisation();
            double statusPenalty = statusLatency(link.getStatus());
            double incidentPenalty = incidentLatency(session, link);
            total += effectiveLatency + loadPenalty + statusPenalty + incidentPenalty;
        }
        // Degraded nodes multiply the whole-route latency.
        for (NetworkNode node : nodes) {
            if (node.getStatus() == NodeStatus.DEGRADED) {
                total *= node.getLatencyMultiplier();
            }
        }
        return total;
    }

    private double statusLatency(LinkStatus status) {
        return switch (status) {
            case BUSY -> BUSY_LATENCY;
            case CONGESTED -> CONGESTED_LATENCY;
            case OVERLOADED -> OVERLOADED_LATENCY;
            default -> 0;
        };
    }

    private double incidentLatency(GameSession session, NetworkLink link) {
        double penalty = 0;
        for (IncidentEvent incident : session.getIncidents()) {
            if ("LINK".equalsIgnoreCase(incident.getTargetType())
                    && link.getId().equals(incident.getTargetId())) {
                penalty += incident.getSeverity() * INCIDENT_LATENCY_PER_SEVERITY;
            }
        }
        return penalty;
    }

    private double computeLossRisk(List<NetworkLink> links, List<LinkStatus> preStatuses) {
        double survive = 1.0;
        for (int i = 0; i < links.size(); i++) {
            double linkRisk = links.get(i).getPacketLossRate() + statusLoss(preStatuses.get(i));
            linkRisk = Math.max(0.0, Math.min(1.0, linkRisk));
            survive *= (1.0 - linkRisk);
        }
        return 1.0 - survive;
    }

    private double statusLoss(LinkStatus status) {
        return switch (status) {
            case BUSY -> BUSY_LOSS;
            case CONGESTED -> CONGESTED_LOSS;
            case OVERLOADED -> OVERLOADED_LOSS;
            default -> 0;
        };
    }

    private void applyLoad(List<NetworkLink> links, int packetSize) {
        for (NetworkLink link : links) {
            link.setCurrentLoad(link.getCurrentLoad() + packetSize);
            link.recomputeStatus();
        }
    }
}
