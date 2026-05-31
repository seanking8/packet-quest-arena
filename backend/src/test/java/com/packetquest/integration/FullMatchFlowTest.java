package com.packetquest.integration;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.packetquest.model.GameSession;
import com.packetquest.model.NetworkLink;
import com.packetquest.model.PacketFlow;
import com.packetquest.model.PacketStatus;
import com.packetquest.model.Player;
import com.packetquest.repository.GameSessionRepository;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;

import java.util.ArrayDeque;
import java.util.ArrayList;
import java.util.Deque;
import java.util.HashMap;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * End-to-end system flow over the real HTTP stack (controllers + services +
 * exception handling), proving the assignment's required journey:
 *
 * <ol>
 *   <li>a session can be created,</li>
 *   <li>a player can join,</li>
 *   <li>a second player can join,</li>
 *   <li>the match can start,</li>
 *   <li>traffic (packet jobs) is generated,</li>
 *   <li>a player submits a routing action,</li>
 *   <li>the packet status and the player's score change accordingly.</li>
 * </ol>
 *
 * <p>The repository is read only to compute a valid path over the generated
 * topology; every state-changing step goes through the public REST API.
 */
@SpringBootTest
@AutoConfigureMockMvc
class FullMatchFlowTest {

    @Autowired
    MockMvc mockMvc;
    @Autowired
    ObjectMapper objectMapper;
    @Autowired
    GameSessionRepository sessionRepo;

    @Test
    void createJoinStartRouteFlow_changesPacketStatusAndScore() throws Exception {
        // 1. Create a session.
        String createBody = mockMvc.perform(post("/api/sessions"))
                .andExpect(status().isCreated())
                .andReturn().getResponse().getContentAsString();
        String sessionId = objectMapper.readTree(createBody).get("sessionId").asText();
        assertThat(sessionId).isNotBlank();

        // 2 + 3. Two players join.
        String aliceId = joinPlayer(sessionId, "Alice");
        String bobId = joinPlayer(sessionId, "Bob");
        assertThat(aliceId).isNotBlank();
        assertThat(bobId).isNotBlank().isNotEqualTo(aliceId);

        // 4. Start the match.
        mockMvc.perform(post("/api/sessions/" + sessionId + "/start"))
                .andExpect(status().isOk());

        // 5. Traffic was generated — Alice has at least one pending packet.
        GameSession session = sessionRepo.findById(sessionId).orElseThrow();
        PacketFlow packet = session.getPacketFlows().stream()
                .filter(p -> p.getOwnerPlayerId().equals(aliceId))
                .filter(p -> p.getStatus() == PacketStatus.PENDING)
                .findFirst()
                .orElseThrow(() -> new AssertionError("expected a generated pending packet for Alice"));

        // Compute a valid connected path over the real topology.
        List<String> path = shortestPath(session.getLinks(),
                packet.getSourceNodeId(), packet.getDestinationNodeId());
        assertThat(path).as("topology should connect packet source to destination").isNotNull();

        // 6. Submit the routing action through the API — client sends ONLY the
        //    path, never a score/latency/result.
        String routeBody = mockMvc.perform(post("/api/sessions/" + sessionId + "/actions/route")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(Map.of(
                                "playerId", aliceId,
                                "packetFlowId", packet.getId(),
                                "path", path))))
                .andExpect(status().isOk())
                .andReturn().getResponse().getContentAsString();
        JsonNode result = objectMapper.readTree(routeBody);
        String packetStatus = result.get("packetStatus").asText();
        int scoreDelta = result.get("scoreDelta").asInt();

        // 7. The backend resolved the packet to a terminal status and applied the
        //    score it computed — Alice routed exactly one packet, so her score
        //    equals that single delta and one delivered/dropped counter advanced.
        assertThat(packetStatus).isIn("DELIVERED", "DROPPED");

        GameSession after = sessionRepo.findById(sessionId).orElseThrow();
        PacketFlow routed = after.getPacketFlows().stream()
                .filter(p -> p.getId().equals(packet.getId())).findFirst().orElseThrow();
        assertThat(routed.getStatus()).isNotEqualTo(PacketStatus.PENDING);

        Player alice = after.getPlayers().stream()
                .filter(p -> p.getId().equals(aliceId)).findFirst().orElseThrow();
        assertThat(alice.getScore()).isEqualTo(scoreDelta);
        assertThat(alice.getDeliveredPackets() + alice.getDroppedPackets()).isEqualTo(1);
    }

    private String joinPlayer(String sessionId, String name) throws Exception {
        MvcResult res = mockMvc.perform(post("/api/sessions/" + sessionId + "/players")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"displayName\":\"" + name + "\"}"))
                .andExpect(status().isCreated())
                .andReturn();
        return objectMapper.readTree(res.getResponse().getContentAsString())
                .get("player").get("id").asText();
    }

    /** Breadth-first path between two nodes over the (undirected) link graph. */
    private static List<String> shortestPath(List<NetworkLink> links, String from, String to) {
        Map<String, List<String>> adj = new HashMap<>();
        for (NetworkLink l : links) {
            adj.computeIfAbsent(l.getSourceNodeId(), k -> new ArrayList<>()).add(l.getTargetNodeId());
            adj.computeIfAbsent(l.getTargetNodeId(), k -> new ArrayList<>()).add(l.getSourceNodeId());
        }
        Deque<List<String>> queue = new ArrayDeque<>();
        queue.add(List.of(from));
        Set<String> seen = new HashSet<>();
        seen.add(from);
        while (!queue.isEmpty()) {
            List<String> p = queue.poll();
            String tail = p.get(p.size() - 1);
            if (tail.equals(to)) {
                return p;
            }
            for (String next : adj.getOrDefault(tail, List.of())) {
                if (seen.add(next)) {
                    List<String> extended = new ArrayList<>(p);
                    extended.add(next);
                    queue.add(extended);
                }
            }
        }
        return null;
    }
}
