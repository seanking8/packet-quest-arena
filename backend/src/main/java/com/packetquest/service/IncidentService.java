package com.packetquest.service;

import com.packetquest.dto.GameStateDto;
import com.packetquest.dto.IncidentSubmissionRequest;
import com.packetquest.exception.SessionNotFoundException;
import com.packetquest.model.GameDifficulty;
import com.packetquest.model.GameSession;
import com.packetquest.model.IncidentEvent;
import com.packetquest.model.IncidentType;
import com.packetquest.model.LinkStatus;
import com.packetquest.model.LinkType;
import com.packetquest.model.NetworkLink;
import com.packetquest.model.NetworkNode;
import com.packetquest.model.NodeStatus;
import com.packetquest.model.VisualZone;
import com.packetquest.persistence.GamePersistenceService;
import com.packetquest.repository.GameSessionRepository;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.time.Instant;
import java.util.ArrayList;
import java.util.HashSet;
import java.util.LinkedHashSet;
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
    private final GamePersistenceService persistenceService;

    public IncidentService(GameSessionRepository sessionRepo, GameStateBroadcaster broadcaster) {
        this(sessionRepo, broadcaster, null);
    }

    @Autowired
    public IncidentService(GameSessionRepository sessionRepo,
                           GameStateBroadcaster broadcaster,
                           ObjectProvider<GamePersistenceService> persistenceProvider) {
        this.sessionRepo = sessionRepo;
        this.broadcaster = broadcaster;
        this.persistenceService = persistenceProvider != null ? persistenceProvider.getIfAvailable() : null;
    }

    public GameStateDto applyIncident(String sessionId, IncidentSubmissionRequest request) {
        GameSession session = sessionRepo.findById(sessionId)
                .orElseThrow(() -> new SessionNotFoundException(sessionId));

        validate(request);

        synchronized (session) {
            Instant now = Instant.now();
            IncidentEvent incident = toIncident(request, now, session.getDifficulty());
            session.addIncident(incident);

            List<NetworkLink> links = resolveLinks(session, request);
            List<NetworkNode> nodes = resolveNodes(session, request);
            incident.setAffectedLinkIds(mergeAffectedLinkIds(request.affectedLinkIds(), links));
            applyEffects(session, incident, links, nodes);

            sessionRepo.save(session);
            if (persistenceService != null) {
                persistenceService.recordEvent(sessionId, "INCIDENT_APPLIED", incident.getId(), incident);
            }
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

    private IncidentEvent toIncident(IncidentSubmissionRequest request, Instant now, GameDifficulty difficulty) {
        IncidentEvent incident = new IncidentEvent(
                UUID.randomUUID().toString(),
                request.eventType(),
                request.targetType(),
                request.targetId(),
                difficulty.scaleIncidentSeverity(request.severity()),
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

    /** Links targeted by id, targetId, or affected link type within the visual zone. */
    private List<NetworkLink> resolveLinks(GameSession session, IncidentSubmissionRequest request) {
        Set<String> ids = new HashSet<>(nullSafe(request.affectedLinkIds()));
        if ("LINK".equalsIgnoreCase(request.targetType()) && request.targetId() != null) {
            ids.add(request.targetId());
        }
        Set<LinkType> types = new HashSet<>(nullSafe(request.affectedLinkTypes()));
        List<NetworkLink> result = new ArrayList<>();
        for (NetworkLink link : session.getLinks()) {
            boolean directMatch = ids.contains(link.getId());
            boolean typeMatch = types.contains(link.getLinkType())
                    && linkTouchesZone(session, link, request.visualZone());
            if (directMatch || typeMatch) {
                result.add(link);
            }
        }
        if (result.isEmpty() && isRecoveryLike(request.eventType()) && request.targetId() != null) {
            Set<String> matchingIncidentLinkIds = linkIdsFromMatchingIncidents(session, request.targetId());
            for (NetworkLink link : session.getLinks()) {
                if (matchingIncidentLinkIds.contains(link.getId())) {
                    result.add(link);
                }
            }
        }
        return result;
    }

    private boolean isRecoveryLike(IncidentType eventType) {
        return eventType == IncidentType.RECOVERY || eventType == IncidentType.WEATHER_CLEAR;
    }

    private Set<String> linkIdsFromMatchingIncidents(GameSession session, String targetId) {
        Set<String> ids = new HashSet<>();
        for (IncidentEvent incident : session.getIncidents()) {
            if (targetId.equals(incident.getTargetId())
                    && incident.getEventType() != IncidentType.RECOVERY
                    && incident.getEventType() != IncidentType.WEATHER_CLEAR) {
                ids.addAll(incident.getAffectedLinkIds());
            }
        }
        return ids;
    }

    private List<String> mergeAffectedLinkIds(List<String> submittedIds, List<NetworkLink> links) {
        Set<String> ids = new LinkedHashSet<>(nullSafe(submittedIds));
        links.forEach(link -> ids.add(link.getId()));
        return new ArrayList<>(ids);
    }

    private boolean linkTouchesZone(GameSession session, NetworkLink link, VisualZone zone) {
        if (zone == null) {
            return true;
        }
        NetworkNode source = findNode(session, link.getSourceNodeId());
        NetworkNode target = findNode(session, link.getTargetNodeId());
        if (source == null || target == null) {
            return false;
        }
        double radius = Math.max(0.0, zone.radius()) + 4.0;
        double midX = (source.getX() + target.getX()) / 2.0;
        double midZ = (source.getZ() + target.getZ()) / 2.0;
        return pointInZone(source.getX(), source.getZ(), zone, radius)
                || pointInZone(target.getX(), target.getZ(), zone, radius)
                || pointInZone(midX, midZ, zone, radius);
    }

    private NetworkNode findNode(GameSession session, String nodeId) {
        return session.getNodes().stream()
                .filter(node -> node.getId().equals(nodeId))
                .findFirst()
                .orElse(null);
    }

    private boolean pointInZone(double x, double z, VisualZone zone, double radius) {
        double dx = x - zone.x();
        double dz = z - zone.z();
        return Math.sqrt(dx * dx + dz * dz) <= radius;
    }

    private List<NetworkNode> resolveNodes(GameSession session, IncidentSubmissionRequest request) {
        Set<String> ids = new HashSet<>(nullSafe(request.affectedNodeIds()));
        if ("NODE".equalsIgnoreCase(request.targetType()) && request.targetId() != null) {
            ids.add(request.targetId());
        }
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
            case FIBRE_CUT, LINK_FAILURE -> {
                if (session.getDifficulty() == GameDifficulty.EASY) {
                    degradeLinks(links, severity);
                } else {
                    links.forEach(l -> l.setStatus(LinkStatus.FAILED));
                }
            }
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

    private void degradeLinks(List<NetworkLink> links, double severity) {
        links.forEach(l -> {
            l.setPacketLossRate(clamp(l.getPacketLossRate() + severity * 0.08));
            l.setCurrentLatencyMs(l.getCurrentLatencyMs() + l.getBaseLatencyMs() * Math.max(0.5, severity));
            l.recomputeStatus();
        });
    }

    /** Recovery / clear: restore affected links/nodes and drop matching incidents. */
    private void recover(GameSession session, IncidentEvent incident,
                         List<NetworkLink> links, List<NetworkNode> nodes) {
        links.forEach(this::restoreLink);
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

    private void restoreLink(NetworkLink link) {
        link.setCurrentLatencyMs(link.getBaseLatencyMs());
        link.setPacketLossRate(baselinePacketLoss(link.getLinkType()));
        if (link.getStatus() == LinkStatus.FAILED || link.getStatus() == LinkStatus.EXPIRED) {
            link.setStatus(LinkStatus.HEALTHY);
        }
        link.recomputeStatus();
    }

    private double baselinePacketLoss(LinkType type) {
        return switch (type) {
            case FIBRE -> 0.001;
            case MICROWAVE, RADIO -> 0.01;
            case MMWAVE, LEGACY -> 0.02;
            case SATELLITE -> 0.03;
        };
    }

    private double clamp(double value) {
        return Math.max(0.0, Math.min(1.0, value));
    }

    private <T> List<T> nullSafe(List<T> list) {
        return list != null ? list : List.of();
    }
}
