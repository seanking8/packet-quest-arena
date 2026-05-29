package com.packetquest.service;

import com.packetquest.dto.GameStateDto;
import com.packetquest.dto.IncidentSubmissionRequest;
import com.packetquest.exception.SessionNotFoundException;
import com.packetquest.model.GameSession;
import com.packetquest.model.IncidentEvent;
import com.packetquest.model.IncidentType;
import com.packetquest.model.LinkStatus;
import com.packetquest.model.LinkType;
import com.packetquest.model.NetworkLink;
import com.packetquest.model.NetworkNode;
import com.packetquest.model.NodeStatus;
import com.packetquest.repository.GameSessionRepository;
import org.springframework.stereotype.Service;

import java.time.Instant;
import java.util.ArrayList;
import java.util.HashSet;
import java.util.List;
import java.util.Set;
import java.util.UUID;

/**
 * Accepts and applies incidents (from the Python simulator) to a session.
 *
 * <p>Validates incoming fields — simulator input is never trusted blindly —
 * then records the incident in the session feed and applies its effects to the
 * relevant links/nodes (status, latency, packet loss). Unknown referenced ids
 * are skipped rather than failing the request.
 */
@Service
public class IncidentService {

    private static final int MAX_DURATION_SECONDS = 300;

    private final GameSessionRepository sessionRepo;
    private final GameStateBroadcaster broadcaster;

    public IncidentService(GameSessionRepository sessionRepo, GameStateBroadcaster broadcaster) {
        this.sessionRepo = sessionRepo;
        this.broadcaster = broadcaster;
    }

    public GameStateDto applyIncident(String sessionId, IncidentSubmissionRequest request) {
        GameSession session = sessionRepo.findById(sessionId)
                .orElseThrow(() -> new SessionNotFoundException(sessionId));

        validate(request);

        synchronized (session) {
            Instant now = Instant.now();
            IncidentEvent incident = toIncident(request, now);
            session.addIncident(incident);

            List<NetworkLink> links = resolveLinks(session, request);
            List<NetworkNode> nodes = resolveNodes(session, request);
            applyEffects(session, incident, links, nodes);

            sessionRepo.save(session);
            GameStateDto state = GameStateDto.from(session, now);
            broadcaster.broadcast(sessionId, state);
            return state;
        }
    }

    private void validate(IncidentSubmissionRequest request) {
        if (request.eventType() == null) {
            throw new IllegalArgumentException("eventType is required.");
        }
        if (request.severity() < 0.0 || request.severity() > 1.0) {
            throw new IllegalArgumentException("severity must be between 0.0 and 1.0.");
        }
        if (request.durationSeconds() < 0 || request.durationSeconds() > MAX_DURATION_SECONDS) {
            throw new IllegalArgumentException(
                    "durationSeconds must be between 0 and " + MAX_DURATION_SECONDS + ".");
        }
    }

    private IncidentEvent toIncident(IncidentSubmissionRequest request, Instant now) {
        IncidentEvent incident = new IncidentEvent(
                UUID.randomUUID().toString(),
                request.eventType(),
                request.targetType(),
                request.targetId(),
                request.severity(),
                request.message(),
                request.durationSeconds());
        incident.setStartedAt(now);
        incident.setExpiresAt(now.plusSeconds(request.durationSeconds()));
        incident.setAffectedLinkTypes(request.affectedLinkTypes());
        incident.setAffectedNodeIds(request.affectedNodeIds());
        incident.setAffectedLinkIds(request.affectedLinkIds());
        incident.setVisualZone(request.visualZone());
        return incident;
    }

    /** Links targeted by id OR by affected link type. */
    private List<NetworkLink> resolveLinks(GameSession session, IncidentSubmissionRequest request) {
        Set<String> ids = new HashSet<>(nullSafe(request.affectedLinkIds()));
        Set<LinkType> types = new HashSet<>(nullSafe(request.affectedLinkTypes()));
        List<NetworkLink> result = new ArrayList<>();
        for (NetworkLink link : session.getLinks()) {
            if (ids.contains(link.getId()) || types.contains(link.getLinkType())) {
                result.add(link);
            }
        }
        return result;
    }

    private List<NetworkNode> resolveNodes(GameSession session, IncidentSubmissionRequest request) {
        Set<String> ids = new HashSet<>(nullSafe(request.affectedNodeIds()));
        List<NetworkNode> result = new ArrayList<>();
        for (NetworkNode node : session.getNodes()) {
            if (ids.contains(node.getId())) {
                result.add(node);
            }
        }
        return result;
    }

    private void applyEffects(GameSession session, IncidentEvent incident,
                              List<NetworkLink> links, List<NetworkNode> nodes) {
        double severity = incident.getSeverity();
        switch (incident.getEventType()) {
            case FIBRE_CUT, LINK_FAILURE -> links.forEach(l -> l.setStatus(LinkStatus.FAILED));
            case LINK_CONGESTION -> links.forEach(l -> {
                l.setCurrentLoad(Math.max(l.getCurrentLoad(), l.getCapacity() * 0.9));
                l.recomputeStatus();
            });
            case PACKET_LOSS_SPIKE -> links.forEach(l ->
                    l.setPacketLossRate(clamp(l.getPacketLossRate() + severity)));
            case LATENCY_SPIKE -> links.forEach(l ->
                    l.setCurrentLatencyMs(l.getCurrentLatencyMs() + severity * 100));
            case WEATHER_ELECTRICAL_STORM, WEATHER_HIGH_WINDS, BUILDING_OBSTRUCTION, CONSTRUCTION ->
                    links.forEach(l -> {
                        l.setPacketLossRate(clamp(l.getPacketLossRate() + severity * 0.1));
                        l.setCurrentLatencyMs(l.getCurrentLatencyMs() + l.getBaseLatencyMs() * severity);
                    });
            case NODE_FAILURE, POWER_OUTAGE -> nodes.forEach(n -> n.setStatus(NodeStatus.FAILED));
            case NODE_DEGRADED -> nodes.forEach(n -> {
                n.setStatus(NodeStatus.DEGRADED);
                n.setLatencyMultiplier(1.0 + severity);
            });
            case TRAFFIC_SURGE -> links.forEach(l -> {
                l.setCurrentLoad(l.getCurrentLoad() + l.getCapacity() * severity);
                l.recomputeStatus();
            });
            case WEATHER_CLEAR, RECOVERY -> recover(session, incident, links, nodes);
        }
    }

    /** Recovery / clear: restore affected links/nodes and drop matching incidents. */
    private void recover(GameSession session, IncidentEvent incident,
                         List<NetworkLink> links, List<NetworkNode> nodes) {
        links.forEach(l -> {
            l.setStatus(LinkStatus.HEALTHY);
            l.recomputeStatus();
        });
        nodes.forEach(n -> {
            n.setStatus(NodeStatus.HEALTHY);
            n.setLatencyMultiplier(1.0);
        });
        if (incident.getTargetId() != null) {
            session.getIncidents().removeIf(other ->
                    other != incident
                            && incident.getTargetId().equals(other.getTargetId())
                            && other.getEventType() != IncidentType.RECOVERY
                            && other.getEventType() != IncidentType.WEATHER_CLEAR);
        }
    }

    private double clamp(double value) {
        return Math.max(0.0, Math.min(1.0, value));
    }

    private <T> List<T> nullSafe(List<T> list) {
        return list != null ? list : List.of();
    }
}
