package com.packetquest.service;

import com.packetquest.model.GameSession;
import com.packetquest.model.LinkType;
import com.packetquest.model.NetworkLink;
import com.packetquest.model.NetworkNode;
import com.packetquest.model.NodeType;
import org.springframework.stereotype.Component;

/**
 * Builds the initial (deterministic) network topology for a match.
 *
 * <p>A small but representative simplified 5G/O-RAN graph: radio access at the
 * edge, the O-RU → O-DU → O-CU chain, edge/UPF/core/data-centre, plus a
 * high-latency satellite backup path. Backend-owned; the frontend only renders
 * the resulting nodes/links. Satellite nodes exist but are not yet playable.
 */
@Component
public class TopologyFactory {

    /** Populates {@code session} with nodes and links (no-op if already populated). */
    public void populate(GameSession session) {
        if (!session.getNodes().isEmpty()) {
            return;
        }

        // --- Nodes: id, name, type, x, y, z (z elevates the satellite) -----
        addNode(session, "ru-north", "Radio Tower North", NodeType.RADIO_TOWER, -40, 30, 0);
        addNode(session, "ru-south", "Radio Tower South", NodeType.RADIO_TOWER, -40, -30, 0);
        addNode(session, "sc-plaza", "Small Cell Plaza", NodeType.SMALL_CELL, -25, 0, 0);
        addNode(session, "oru-1", "O-RU Central", NodeType.O_RU, -10, 0, 0);
        addNode(session, "odu-1", "O-DU Hub", NodeType.O_DU, 5, 0, 0);
        addNode(session, "ocu-1", "O-CU Hub", NodeType.O_CU, 20, 0, 0);
        addNode(session, "edge-1", "Edge Data Centre", NodeType.EDGE, 30, 20, 0);
        addNode(session, "upf-1", "UPF Gateway", NodeType.UPF, 35, 0, 0);
        addNode(session, "core-1", "Core Data Centre", NodeType.CORE, 50, 0, 0);
        addNode(session, "dc-1", "Regional Data Centre", NodeType.DATA_CENTRE, 65, 10, 0);
        addNode(session, "sat-1", "Satellite Relay", NodeType.SATELLITE, 5, 0, 60);

        // --- Links: id, source, target, type, capacity --------------------
        addLink(session, "l-runorth-oru", "ru-north", "oru-1", LinkType.RADIO, 60, 10);
        addLink(session, "l-rusouth-oru", "ru-south", "oru-1", LinkType.RADIO, 60, 10);
        addLink(session, "l-sc-oru", "sc-plaza", "oru-1", LinkType.MMWAVE, 80, 8);
        addLink(session, "l-runorth-sc", "ru-north", "sc-plaza", LinkType.LEGACY, 40, 25);
        addLink(session, "l-oru-odu", "oru-1", "odu-1", LinkType.FIBRE, 100, 5);
        addLink(session, "l-odu-ocu", "odu-1", "ocu-1", LinkType.FIBRE, 100, 5);
        addLink(session, "l-ocu-edge", "ocu-1", "edge-1", LinkType.FIBRE, 100, 5);
        addLink(session, "l-ocu-upf", "ocu-1", "upf-1", LinkType.FIBRE, 100, 5);
        addLink(session, "l-edge-upf", "edge-1", "upf-1", LinkType.MICROWAVE, 50, 12);
        addLink(session, "l-upf-core", "upf-1", "core-1", LinkType.FIBRE, 120, 5);
        addLink(session, "l-core-dc", "core-1", "dc-1", LinkType.FIBRE, 120, 5);
        addLink(session, "l-rusouth-sat", "ru-south", "sat-1", LinkType.SATELLITE, 30, 120);
        addLink(session, "l-sat-core", "sat-1", "core-1", LinkType.SATELLITE, 30, 120);
    }

    private void addNode(GameSession session, String id, String name, NodeType type,
                         double x, double y, double z) {
        session.addNode(new NetworkNode(id, name, type, x, y, z));
    }

    private void addLink(GameSession session, String id, String sourceId, String targetId,
                         LinkType type, double capacity, double baseLatencyMs) {
        NetworkLink link = new NetworkLink(id, sourceId, targetId, type, capacity);
        link.setBaseLatencyMs(baseLatencyMs);
        link.setCurrentLatencyMs(baseLatencyMs);
        session.addLink(link);
    }
}
