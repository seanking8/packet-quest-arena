package com.packetquest.service;

import com.packetquest.config.TrafficProfile;
import com.packetquest.config.TrafficProfiles;
import com.packetquest.model.GameSession;
import com.packetquest.model.NetworkNode;
import com.packetquest.model.NodeType;
import com.packetquest.model.PacketFlow;
import com.packetquest.model.Player;
import com.packetquest.model.TrafficType;
import org.springframework.stereotype.Service;

import java.time.Instant;
import java.util.EnumSet;
import java.util.List;
import java.util.Set;
import java.util.UUID;

/**
 * Generates player-owned packet jobs over the shared topology.
 *
 * <p>Each packet belongs to exactly one player (routing another player's packet
 * is rejected later). Traffic type drives value/deadline/load via
 * {@link TrafficProfiles}. Sources are radio/small-cell/O-RU access nodes and
 * destinations are core/edge/UPF/data-centre sinks, so jobs are meaningful and
 * never share source and destination.
 */
@Service
public class PacketFlowGenerationService {

    /** Number of pending jobs each player starts the match with (>= 3 required). */
    public static final int INITIAL_JOBS_PER_PLAYER = 4;

    /** Rotation used to spread traffic types across players and ticks. */
    private static final List<TrafficType> ROTATION = List.of(
            TrafficType.EMERGENCY,
            TrafficType.CONTROL,
            TrafficType.VIDEO,
            TrafficType.IOT,
            TrafficType.BACKGROUND
    );

    private static final Set<NodeType> SOURCE_TYPES =
            EnumSet.of(NodeType.RADIO_TOWER, NodeType.SMALL_CELL, NodeType.O_RU);
    private static final Set<NodeType> SINK_TYPES =
            EnumSet.of(NodeType.CORE, NodeType.EDGE, NodeType.UPF, NodeType.DATA_CENTRE);

    private final TrafficProfiles trafficProfiles;

    public PacketFlowGenerationService(TrafficProfiles trafficProfiles) {
        this.trafficProfiles = trafficProfiles;
    }

    /** Creates the initial set of PENDING jobs for every player at match start. */
    public void generateInitialJobs(GameSession session) {
        List<Player> players = session.getPlayers();
        for (int i = 0; i < players.size(); i++) {
            createJobsForPlayer(session, players.get(i), i, INITIAL_JOBS_PER_PLAYER);
        }
    }

    /**
     * Periodic-generation hook: adds {@code jobsPerPlayer} new jobs to each
     * player during a traffic tick. The type/route rotation continues from the
     * current packet count so successive ticks stay varied.
     */
    public void generateTickJobs(GameSession session, int jobsPerPlayer) {
        if (jobsPerPlayer <= 0) {
            return;
        }
        int offset = session.getPacketFlows().size();
        List<Player> players = session.getPlayers();
        for (int i = 0; i < players.size(); i++) {
            createJobsForPlayer(session, players.get(i), offset + i, jobsPerPlayer);
        }
    }

    private void createJobsForPlayer(GameSession session, Player player, int offset, int count) {
        List<NetworkNode> sources = nodesOfType(session, SOURCE_TYPES);
        List<NetworkNode> sinks = nodesOfType(session, SINK_TYPES);
        // Avoid generating impossible jobs if the topology lacks endpoints.
        if (sources.isEmpty() || sinks.isEmpty()) {
            return;
        }

        Instant now = Instant.now();
        for (int j = 0; j < count; j++) {
            int step = offset + j;
            TrafficType type = ROTATION.get(Math.floorMod(step, ROTATION.size()));
            NetworkNode source = sources.get(Math.floorMod(step, sources.size()));
            NetworkNode destination = sinks.get(Math.floorMod(step, sinks.size()));
            session.addPacketFlow(buildJob(player, type, source, destination, now));
        }
    }

    private PacketFlow buildJob(Player player, TrafficType type,
                                NetworkNode source, NetworkNode destination, Instant now) {
        TrafficProfile profile = trafficProfiles.profileFor(type);
        PacketFlow flow = new PacketFlow(
                UUID.randomUUID().toString(),
                player.getId(),
                source.getId(),
                destination.getId(),
                type,
                profile.packetSize(),
                profile.deadlineSeconds()
        );
        flow.setCreatedAt(now);
        flow.setExpiresAt(now.plusSeconds(profile.deadlineSeconds()));
        // status defaults to PENDING; selectedPath null; latencyMs/scoreDelta 0
        return flow;
    }

    private List<NetworkNode> nodesOfType(GameSession session, Set<NodeType> types) {
        return session.getNodes().stream()
                .filter(n -> types.contains(n.getType()))
                .toList();
    }
}
