package com.packetquest.factory;

import com.packetquest.model.GameSession;
import com.packetquest.model.Node;
import com.packetquest.model.PacketFlow;
import org.springframework.stereotype.Component;

import java.security.SecureRandom;
import java.util.ArrayList;
import java.util.List;

/**
 * Builds the initial packet flows for a session.
 * - Always includes at least one EMERGENCY and one BACKGROUND flow (required by AC).
 * - Adds a few extra random flows of mixed types for variety.
 * - Each flow gets a random source/destination (different nodes) and a bandwidth.
 */
@Component
public class PacketFlowFactory {

    private static final String[] OTHER_TYPES = {"VIDEO", "IOT", "CONTROL"};
    private static final int EXTRA_FLOWS = 3; // on top of the two required types
    private final SecureRandom random = new SecureRandom();

    public List<PacketFlow> buildFlows(GameSession session, List<Node> nodes) {
        if (nodes == null || nodes.size() < 2) {
            return List.of(); // can't make a flow without at least two nodes
        }
        List<PacketFlow> flows = new ArrayList<>();

        // Guarantee the two required types
        flows.add(makeFlow(session, nodes, "EMERGENCY"));
        flows.add(makeFlow(session, nodes, "BACKGROUND"));

        // A few extras for variety
        for (int i = 0; i < EXTRA_FLOWS; i++) {
            String type = OTHER_TYPES[random.nextInt(OTHER_TYPES.length)];
            flows.add(makeFlow(session, nodes, type));
        }
        return flows;
    }

    private PacketFlow makeFlow(GameSession session, List<Node> nodes, String trafficType) {
        Node src = nodes.get(random.nextInt(nodes.size()));
        Node dst = nodes.get(random.nextInt(nodes.size()));
        while (dst.getId().equals(src.getId())) {  // ensure distinct endpoints
            dst = nodes.get(random.nextInt(nodes.size()));
        }
        PacketFlow flow = new PacketFlow();
        flow.setSession(session);
        flow.setSourceNodeId(src.getId());
        flow.setDestinationNodeId(dst.getId());
        flow.setTrafficType(trafficType);
        flow.setStatus("PENDING");
        flow.setBandwidth(10 + random.nextInt(21)); // 10..30
        return flow;
    }
}