package com.packetquest.dto;

import com.packetquest.model.GameSession;
import com.packetquest.model.IncidentEvent;
import com.packetquest.model.NetworkLink;
import com.packetquest.model.NetworkNode;
import com.packetquest.model.PacketFlow;
import com.packetquest.model.Player;
import com.packetquest.model.SessionStatus;

import java.time.Instant;
import java.util.List;

/**
 * Immutable read model broadcast to / fetched by the frontend.
 *
 * <p>Every value here is computed by the backend (status, remaining time,
 * scores, link load, packet status). The frontend renders these values but
 * never derives them. {@code serverTime} lets clients reconcile their clocks.
 */
public record GameStateDto(
        String sessionId,
        SessionStatus status,
        long remainingSeconds,
        List<Player> players,
        List<NetworkNode> nodes,
        List<NetworkLink> links,
        List<PacketFlow> packetFlows,
        List<IncidentEvent> incidents,
        Instant serverTime
) {

    /** Snapshot a session against the current time. */
    public static GameStateDto from(GameSession session) {
        return from(session, Instant.now());
    }

    /** Snapshot a session against the supplied instant (deterministic for tests). */
    public static GameStateDto from(GameSession session, Instant now) {
        return new GameStateDto(
                session.getId(),
                session.getStatus(),
                session.remainingSeconds(now),
                List.copyOf(session.getPlayers()),
                List.copyOf(session.getNodes()),
                List.copyOf(session.getLinks()),
                List.copyOf(session.getPacketFlows()),
                List.copyOf(session.getIncidents()),
                now
        );
    }
}
