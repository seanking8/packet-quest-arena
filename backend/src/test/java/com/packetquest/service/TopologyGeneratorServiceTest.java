package com.packetquest.service;

import com.packetquest.model.GameSession;
import com.packetquest.model.NetworkLink;
import com.packetquest.model.NetworkNode;
import com.packetquest.model.NodeType;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import java.util.HashMap;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * Verifies the generated topology meets the Section 3 acceptance criteria:
 * non-empty, ≥12 nodes, ≥18 links, every node has coordinates, satellites are
 * present and linked, no link references a missing node, and there are at least
 * two alternative routes between major nodes.
 */
class TopologyGeneratorServiceTest {

    private GameSession session;

    @BeforeEach
    void setUp() {
        session = new GameSession();
        new TopologyGeneratorService().populate(session);
    }

    @Test
    void generatesNonEmptyTopologyMeetingMinimumCounts() {
        assertThat(session.getNodes()).hasSizeGreaterThanOrEqualTo(12);
        assertThat(session.getLinks()).hasSizeGreaterThanOrEqualTo(18);
    }

    @Test
    void everyNodeHasIdTypeAndCoordinates() {
        for (NetworkNode node : session.getNodes()) {
            assertThat(node.getId()).isNotBlank();
            assertThat(node.getType()).isNotNull();
            // y is height; satellites sit high, city nodes low — all finite.
            assertThat(node.getY()).isFinite();
            assertThat(node.getX()).isFinite();
            assertThat(node.getZ()).isFinite();
        }
    }

    @Test
    void satellitesExistHighUpAndHaveLinks() {
        List<NetworkNode> satellites = session.getNodes().stream()
                .filter(n -> n.getType() == NodeType.SATELLITE)
                .toList();

        assertThat(satellites).isNotEmpty();
        assertThat(satellites).allSatisfy(sat -> {
            assertThat(sat.getY()).isGreaterThanOrEqualTo(80.0);
            boolean hasLink = session.getLinks().stream()
                    .anyMatch(l -> l.getSourceNodeId().equals(sat.getId())
                            || l.getTargetNodeId().equals(sat.getId()));
            assertThat(hasLink).as("satellite %s should transmit on a link", sat.getId()).isTrue();
        });
    }

    @Test
    void noLinkReferencesMissingNode() {
        Set<String> nodeIds = new HashSet<>();
        session.getNodes().forEach(n -> nodeIds.add(n.getId()));

        for (NetworkLink link : session.getLinks()) {
            assertThat(nodeIds)
                    .as("link %s source", link.getId())
                    .contains(link.getSourceNodeId());
            assertThat(nodeIds)
                    .as("link %s target", link.getId())
                    .contains(link.getTargetNodeId());
        }
    }

    @Test
    void linksHaveSaneCapacityAndLatency() {
        for (NetworkLink link : session.getLinks()) {
            assertThat(link.getCapacity()).isPositive();
            assertThat(link.getCurrentLoad()).isZero();
            assertThat(link.getBaseLatencyMs()).isPositive();
            assertThat(link.getCurrentLatencyMs()).isEqualTo(link.getBaseLatencyMs());
            assertThat(link.getPacketLossRate()).isBetween(0.0, 1.0);
        }
    }

    @Test
    void atLeastTwoAlternativeRoutesBetweenMajorNodes() {
        // Treat links as undirected for route counting.
        Map<String, Set<String>> adjacency = new HashMap<>();
        for (NetworkLink link : session.getLinks()) {
            adjacency.computeIfAbsent(link.getSourceNodeId(), k -> new HashSet<>()).add(link.getTargetNodeId());
            adjacency.computeIfAbsent(link.getTargetNodeId(), k -> new HashSet<>()).add(link.getSourceNodeId());
        }

        int paths = countSimplePaths(adjacency, "ru-north", "core-1", new HashSet<>(), 2);
        assertThat(paths)
                .as("there should be >= 2 distinct routes from ru-north to core-1")
                .isGreaterThanOrEqualTo(2);
    }

    /** Counts distinct simple paths from {@code current} to {@code target}, stopping early at {@code cap}. */
    private int countSimplePaths(Map<String, Set<String>> adjacency, String current, String target,
                                 Set<String> visited, int cap) {
        if (current.equals(target)) {
            return 1;
        }
        visited.add(current);
        int found = 0;
        for (String next : adjacency.getOrDefault(current, Set.of())) {
            if (visited.contains(next)) {
                continue;
            }
            found += countSimplePaths(adjacency, next, target, visited, cap);
            if (found >= cap) {
                break;
            }
        }
        visited.remove(current);
        return found;
    }
}
