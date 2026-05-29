package com.packetquest.service;

import com.packetquest.model.GameSession;
import com.packetquest.model.PacketFlow;
import com.packetquest.model.Player;
import com.packetquest.model.TrafficType;
import org.springframework.stereotype.Component;

import java.time.Instant;
import java.util.List;

/**
 * Generates the initial set of packet jobs each player starts the match with.
 *
 * <p>Deterministic for the foundation: every player receives one job per
 * traffic type below, routed from a radio access node to the core. Packet size
 * and deadline come from the design's traffic table. Routing/scoring of these
 * jobs is NOT implemented here — they are created in {@link com.packetquest.model.PacketStatus#PENDING}.
 */
@Component
public class PacketJobFactory {

    /** Traffic types issued to each player at match start (one job each). */
    private static final List<TrafficType> INITIAL_TYPES = List.of(
            TrafficType.EMERGENCY,
            TrafficType.CONTROL,
            TrafficType.VIDEO
    );

    private static final String DEFAULT_SOURCE = "ru-north";
    private static final String DEFAULT_DESTINATION = "core-1";

    /** Creates initial PENDING packet jobs for every player in the session. */
    public void generateInitialJobs(GameSession session) {
        Instant now = Instant.now();
        for (Player player : session.getPlayers()) {
            for (TrafficType type : INITIAL_TYPES) {
                session.addPacketFlow(buildJob(player, type, now));
            }
        }
    }

    private PacketFlow buildJob(Player player, TrafficType type, Instant now) {
        int packetSize = packetSizeFor(type);
        int deadline = deadlineSecondsFor(type);

        PacketFlow flow = new PacketFlow(
                java.util.UUID.randomUUID().toString(),
                player.getId(),
                DEFAULT_SOURCE,
                DEFAULT_DESTINATION,
                type,
                packetSize,
                deadline
        );
        flow.setCreatedAt(now);
        flow.setExpiresAt(now.plusSeconds(deadline));
        return flow;
    }

    /** Relative network load of a packet, per the design traffic table. */
    private int packetSizeFor(TrafficType type) {
        return switch (type) {
            case EMERGENCY -> 8;
            case CONTROL -> 6;
            case VIDEO -> 20;
            case IOT -> 4;
            case BACKGROUND -> 12;
        };
    }

    /** SLA deadline in seconds, per the design traffic table. */
    private int deadlineSecondsFor(TrafficType type) {
        return switch (type) {
            case EMERGENCY -> 8;
            case CONTROL -> 12;
            case VIDEO -> 20;
            case IOT -> 30;
            case BACKGROUND -> 45;
        };
    }
}
