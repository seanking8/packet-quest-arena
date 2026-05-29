package com.packetquest.service;

import com.packetquest.config.TrafficProfiles;
import com.packetquest.dto.GameStateDto;
import com.packetquest.exception.SessionNotFoundException;
import com.packetquest.model.GameSession;
import com.packetquest.model.IncidentEvent;
import com.packetquest.model.LinkStatus;
import com.packetquest.model.LinkType;
import com.packetquest.model.NetworkLink;
import com.packetquest.model.NetworkNode;
import com.packetquest.model.NodeStatus;
import com.packetquest.model.PacketFlow;
import com.packetquest.model.PacketStatus;
import com.packetquest.model.Player;
import com.packetquest.model.SessionStatus;
import com.packetquest.repository.GameSessionRepository;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;

import java.time.Instant;

/**
 * Advances the game world by one tick: decays link load, expires overdue
 * packets, tops up packet jobs, expires finished incidents and auto-completes
 * the match when the timer runs out.
 *
 * <p>A scheduled loop keeps active matches moving even when no player takes an
 * action. The manual {@code /tick} endpoint remains useful for tests and demos.
 * The backend stays authoritative for time, expiry, load and completion.
 */
@Service
public class GameTickService {

    /** Fraction of current link load removed each tick. */
    public static final double LOAD_DECAY_RATE = 0.25;
    /** Loads below this snap to zero so congestion can fully clear. */
    private static final double LOAD_ZERO_EPSILON = 1.0;

    private final GameSessionRepository sessionRepo;
    private final PacketFlowGenerationService packetFlowGenerator;
    private final TrafficProfiles trafficProfiles;
    private final ScoreCalculator scoreCalculator;
    private final GameStateBroadcaster broadcaster;

    public GameTickService(GameSessionRepository sessionRepo,
                           PacketFlowGenerationService packetFlowGenerator,
                           TrafficProfiles trafficProfiles,
                           ScoreCalculator scoreCalculator,
                           GameStateBroadcaster broadcaster) {
        this.sessionRepo = sessionRepo;
        this.packetFlowGenerator = packetFlowGenerator;
        this.trafficProfiles = trafficProfiles;
        this.scoreCalculator = scoreCalculator;
        this.broadcaster = broadcaster;
    }

    @Scheduled(fixedRateString = "${packetquest.tick.fixed-rate-ms:1000}")
    public void tickActiveSessions() {
        for (GameSession session : sessionRepo.findAll()) {
            if (session.getStatus() == SessionStatus.ACTIVE) {
                tick(session.getId());
            }
        }
    }

    public GameStateDto tick(String sessionId) {
        GameSession session = sessionRepo.findById(sessionId)
                .orElseThrow(() -> new SessionNotFoundException(sessionId));

        synchronized (session) {
            Instant now = Instant.now();

            // A non-active match never changes on tick (completed stays final).
            if (session.getStatus() != SessionStatus.ACTIVE) {
                GameStateDto state = GameStateDto.from(session, now);
                broadcaster.broadcast(sessionId, state);
                return state;
            }

            decayLinkLoad(session);
            expireOverduePackets(session, now);
            expireFinishedIncidents(session, now);

            if (session.remainingSeconds(now) <= 0) {
                session.complete(now); // stop generating; keep final scores
            } else {
                packetFlowGenerator.replenishPendingJobs(
                        session, PacketFlowGenerationService.MIN_PENDING_PER_PLAYER);
            }

            sessionRepo.save(session);
            GameStateDto state = GameStateDto.from(session, now);
            broadcaster.broadcast(sessionId, state);
            return state;
        }
    }

    private void decayLinkLoad(GameSession session) {
        for (NetworkLink link : session.getLinks()) {
            double decayed = link.getCurrentLoad() * (1.0 - LOAD_DECAY_RATE);
            if (decayed < LOAD_ZERO_EPSILON) {
                decayed = 0.0;
            }
            link.setCurrentLoad(decayed);
            link.recomputeStatus();
        }
    }

    private void expireOverduePackets(GameSession session, Instant now) {
        for (PacketFlow packet : session.getPacketFlows()) {
            boolean overdue = packet.getStatus() == PacketStatus.PENDING
                    && packet.getExpiresAt() != null
                    && now.isAfter(packet.getExpiresAt());
            if (!overdue) {
                continue;
            }
            int penalty = scoreCalculator.dropScore(trafficProfiles.profileFor(packet.getTrafficType()));
            packet.setStatus(PacketStatus.EXPIRED);
            packet.setScoreDelta(penalty);
            Player owner = findPlayer(session, packet.getOwnerPlayerId());
            if (owner != null) {
                owner.addScore(penalty);
                owner.setDroppedPackets(owner.getDroppedPackets() + 1);
            }
        }
    }

    private void expireFinishedIncidents(GameSession session, Instant now) {
        session.getIncidents().removeIf(incident -> {
            Instant expiry = incidentExpiry(incident);
            boolean expired = expiry != null && now.isAfter(expiry);
            if (expired) {
                recoverExpiredIncident(session, incident);
            }
            return expired;
        });
    }

    private void recoverExpiredIncident(GameSession session, IncidentEvent incident) {
        for (NetworkLink link : session.getLinks()) {
            boolean affectedById = incident.getAffectedLinkIds().contains(link.getId());
            boolean affectedByType = incident.getAffectedLinkTypes().contains(link.getLinkType());
            if (affectedById || affectedByType) {
                restoreLink(link);
            }
        }
        for (NetworkNode node : session.getNodes()) {
            if (incident.getAffectedNodeIds().contains(node.getId())) {
                node.setStatus(NodeStatus.HEALTHY);
                node.setLatencyMultiplier(1.0);
            }
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

    private Instant incidentExpiry(IncidentEvent incident) {
        if (incident.getExpiresAt() != null) {
            return incident.getExpiresAt();
        }
        if (incident.getStartedAt() != null) {
            return incident.getStartedAt().plusSeconds(incident.getDurationSeconds());
        }
        return null;
    }

    private Player findPlayer(GameSession session, String playerId) {
        return session.getPlayers().stream()
                .filter(p -> p.getId().equals(playerId))
                .findFirst()
                .orElse(null);
    }
}
