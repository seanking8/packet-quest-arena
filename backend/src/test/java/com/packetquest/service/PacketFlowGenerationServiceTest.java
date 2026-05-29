package com.packetquest.service;

import com.packetquest.config.TrafficProfile;
import com.packetquest.config.TrafficProfiles;
import com.packetquest.model.GameSession;
import com.packetquest.model.PacketFlow;
import com.packetquest.model.PacketStatus;
import com.packetquest.model.Player;
import com.packetquest.model.TrafficType;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import java.time.Duration;
import java.util.HashSet;
import java.util.List;
import java.util.Set;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * Tests for {@link PacketFlowGenerationService}: every player gets jobs at
 * start, ownership/endpoints are correct, types vary, and timing/status
 * defaults follow the spec.
 */
class PacketFlowGenerationServiceTest {

    private GameSession session;
    private PacketFlowGenerationService generator;
    private Player alice;
    private Player bob;

    @BeforeEach
    void setUp() {
        session = new GameSession();
        new TopologyGeneratorService().populate(session);
        alice = session.addPlayer("Alice", "blue");
        bob = session.addPlayer("Bob", "green");
        generator = new PacketFlowGenerationService(new TrafficProfiles());
        generator.generateInitialJobs(session);
    }

    @Test
    void eachPlayerReceivesAtLeastThreeJobs() {
        assertThat(jobsOf(alice)).hasSizeGreaterThanOrEqualTo(3);
        assertThat(jobsOf(bob)).hasSizeGreaterThanOrEqualTo(3);
        assertThat(session.getPacketFlows())
                .hasSize(2 * PacketFlowGenerationService.INITIAL_JOBS_PER_PLAYER);
    }

    @Test
    void everyJobIsOwnedBySomePlayer() {
        Set<String> playerIds = Set.of(alice.getId(), bob.getId());
        assertThat(session.getPacketFlows())
                .allSatisfy(flow -> assertThat(playerIds).contains(flow.getOwnerPlayerId()));
    }

    @Test
    void sourceAndDestinationExistAndDiffer() {
        Set<String> nodeIds = new HashSet<>();
        session.getNodes().forEach(n -> nodeIds.add(n.getId()));

        assertThat(session.getPacketFlows()).allSatisfy(flow -> {
            assertThat(nodeIds).contains(flow.getSourceNodeId());
            assertThat(nodeIds).contains(flow.getDestinationNodeId());
            assertThat(flow.getSourceNodeId()).isNotEqualTo(flow.getDestinationNodeId());
        });
    }

    @Test
    void multipleTrafficTypesAreGenerated() {
        Set<TrafficType> types = new HashSet<>();
        session.getPacketFlows().forEach(f -> types.add(f.getTrafficType()));
        assertThat(types).hasSizeGreaterThanOrEqualTo(2);
    }

    @Test
    void allJobsStartPendingWithCleanResultFields() {
        assertThat(session.getPacketFlows()).allSatisfy(flow -> {
            assertThat(flow.getStatus()).isEqualTo(PacketStatus.PENDING);
            assertThat(flow.getSelectedPath()).isNull();
            assertThat(flow.getLatencyMs()).isZero();
            assertThat(flow.getScoreDelta()).isZero();
        });
    }

    @Test
    void expiresAtIsCreatedAtPlusDeadline() {
        TrafficProfiles profiles = new TrafficProfiles();
        assertThat(session.getPacketFlows()).allSatisfy(flow -> {
            TrafficProfile profile = profiles.profileFor(flow.getTrafficType());
            assertThat(flow.getDeadlineSeconds()).isEqualTo(profile.deadlineSeconds());
            assertThat(flow.getPacketSize()).isEqualTo(profile.packetSize());
            long gap = Duration.between(flow.getCreatedAt(), flow.getExpiresAt()).getSeconds();
            assertThat(gap).isEqualTo(profile.deadlineSeconds());
        });
    }

    @Test
    void tickHookGeneratesAdditionalJobsPerPlayer() {
        int before = session.getPacketFlows().size();

        generator.generateTickJobs(session, 2);

        assertThat(session.getPacketFlows()).hasSize(before + 2 * 2);
        assertThat(jobsOf(alice)).hasSizeGreaterThan(PacketFlowGenerationService.INITIAL_JOBS_PER_PLAYER - 1);
    }

    @Test
    void generateInitialJobs_withoutTopology_producesNothing() {
        GameSession empty = new GameSession();
        empty.addPlayer("Solo", "blue");

        generator.generateInitialJobs(empty);

        assertThat(empty.getPacketFlows()).isEmpty();
    }

    private List<PacketFlow> jobsOf(Player player) {
        return session.getPacketFlows().stream()
                .filter(f -> f.getOwnerPlayerId().equals(player.getId()))
                .toList();
    }
}
