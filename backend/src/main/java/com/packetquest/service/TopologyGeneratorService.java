package com.packetquest.service;

import com.packetquest.model.GameSession;
import com.packetquest.model.LinkType;
import com.packetquest.model.MapObject;
import com.packetquest.model.MapObjectType;
import com.packetquest.model.NetworkLink;
import com.packetquest.model.NetworkNode;
import com.packetquest.model.NodeType;
import org.springframework.stereotype.Service;

/**
 * Generates the shared, backend-owned network topology for a match.
 *
 * <p>All players share one topology and the frontend renders it directly from
 * the node/link coordinates produced here. The layout is a deterministic,
 * simplified 5G/O-RAN city graph designed to be student-readable yet visually
 * interesting, with redundant paths so routing has meaningful choices.
 *
 * <p><b>Coordinate convention:</b> {@code y} is height. City nodes sit low
 * (y ≈ 0–3); satellite relays sit high above the map (y ≈ 80+), so the frontend
 * can support close, isometric, and planet-style camera levels. {@code x}/{@code z}
 * form the ground plane.
 */
@Service
public class TopologyGeneratorService {

    /**
     * Populates {@code session} with nodes, links and decorative map objects.
     * No-op if the session already has a topology (idempotent on restart).
     */
    public void populate(GameSession session) {
        if (!session.getNodes().isEmpty()) {
            return;
        }
        addNodes(session);
        addLinks(session);
        addMapObjects(session);
    }

    private void addNodes(GameSession session) {
        // Radio access (towers + central O-RU), slightly elevated masts.
        node(session, "ru-north", "Radio Tower North", NodeType.RADIO_TOWER, -30, 3, 30);
        node(session, "ru-south", "Radio Tower South", NodeType.RADIO_TOWER, -30, 3, -30);
        node(session, "ru-east", "Radio Tower East", NodeType.RADIO_TOWER, 40, 3, 30);
        node(session, "ru-west", "Radio Tower West", NodeType.RADIO_TOWER, -50, 3, 0);
        node(session, "oru-central", "O-RU Central", NodeType.O_RU, -10, 2, 0);

        // Small cells on/near buildings.
        node(session, "sc-plaza", "Small Cell Plaza", NodeType.SMALL_CELL, -20, 2, 15);
        node(session, "sc-market", "Small Cell Market", NodeType.SMALL_CELL, 10, 2, 20);
        node(session, "sc-harbor", "Small Cell Harbor", NodeType.SMALL_CELL, 20, 2, -25);

        // Aggregation / control.
        node(session, "odu-1", "O-DU North Hub", NodeType.O_DU, 0, 1, 10);
        node(session, "odu-2", "O-DU South Hub", NodeType.O_DU, 0, 1, -15);
        node(session, "ocu-1", "O-CU Control", NodeType.O_CU, 20, 1, 0);

        // Core transport chain.
        node(session, "edge-1", "Edge Data Centre", NodeType.EDGE, 30, 1, 18);
        node(session, "upf-1", "UPF Gateway", NodeType.UPF, 40, 1, 0);
        node(session, "core-1", "Core Data Centre", NodeType.CORE, 55, 1, 0);
        node(session, "dc-1", "Regional Data Centre", NodeType.DATA_CENTRE, 70, 1, 12);

        // Fixed satellite relays high above the city.
        node(session, "sat-1", "Satellite Relay Alpha", NodeType.SATELLITE, 0, 85, 0);
        node(session, "sat-2", "Satellite Relay Beta", NodeType.SATELLITE, 40, 90, 10);
    }

    private void addLinks(GameSession session) {
        // RADIO: access towers into the network.
        link(session, "l-runorth-oru", "ru-north", "oru-central", LinkType.RADIO);
        link(session, "l-rusouth-oru", "ru-south", "oru-central", LinkType.RADIO);
        link(session, "l-ruwest-oru", "ru-west", "oru-central", LinkType.RADIO);
        link(session, "l-rueast-ocu", "ru-east", "ocu-1", LinkType.RADIO);

        // MMWAVE: small cells, high capacity / short reach.
        link(session, "l-scplaza-oru", "sc-plaza", "oru-central", LinkType.MMWAVE);
        link(session, "l-scplaza-runorth", "sc-plaza", "ru-north", LinkType.MMWAVE);
        link(session, "l-scmarket-ocu", "sc-market", "ocu-1", LinkType.MMWAVE);
        link(session, "l-scharbor-ocu", "sc-harbor", "ocu-1", LinkType.MMWAVE);

        // MICROWAVE: tower-to-tower backhaul.
        link(session, "l-runorth-rueast", "ru-north", "ru-east", LinkType.MICROWAVE);
        link(session, "l-ruwest-rusouth", "ru-west", "ru-south", LinkType.MICROWAVE);

        // FIBRE: O-DU / O-CU / edge / UPF / core transport.
        link(session, "l-oru-odu1", "oru-central", "odu-1", LinkType.FIBRE);
        link(session, "l-oru-odu2", "oru-central", "odu-2", LinkType.FIBRE);
        link(session, "l-odu1-ocu", "odu-1", "ocu-1", LinkType.FIBRE);
        link(session, "l-odu2-ocu", "odu-2", "ocu-1", LinkType.FIBRE);
        link(session, "l-ocu-edge", "ocu-1", "edge-1", LinkType.FIBRE);
        link(session, "l-ocu-upf", "ocu-1", "upf-1", LinkType.FIBRE);
        link(session, "l-edge-upf", "edge-1", "upf-1", LinkType.FIBRE);
        link(session, "l-upf-core", "upf-1", "core-1", LinkType.FIBRE);
        link(session, "l-core-dc", "core-1", "dc-1", LinkType.FIBRE);

        // LEGACY: reliable backups, higher latency / lower capacity.
        link(session, "l-runorth-odu1", "ru-north", "odu-1", LinkType.LEGACY);
        link(session, "l-odu1-odu2", "odu-1", "odu-2", LinkType.LEGACY);

        // SATELLITE: high-latency wide-area backup paths.
        link(session, "l-sat1-rusouth", "sat-1", "ru-south", LinkType.SATELLITE);
        link(session, "l-sat1-core", "sat-1", "core-1", LinkType.SATELLITE);
        link(session, "l-sat2-rueast", "sat-2", "ru-east", LinkType.SATELLITE);
        link(session, "l-sat2-dc", "sat-2", "dc-1", LinkType.SATELLITE);
    }

    /** A few lightweight decorative / obstruction objects for the 3D city. */
    private void addMapObjects(GameSession session) {
        session.addMapObject(new MapObject("bld-1", MapObjectType.DECORATIVE_BUILDING,
                "Office Block", -15, 0, 22, 6, 12, 6));
        session.addMapObject(new MapObject("bld-2", MapObjectType.DECORATIVE_BUILDING,
                "Apartments", 12, 0, -10, 8, 9, 8));
        session.addMapObject(new MapObject("bld-3", MapObjectType.DECORATIVE_BUILDING,
                "Market Hall", 8, 0, 25, 10, 6, 10));
        session.addMapObject(new MapObject("obs-1", MapObjectType.TALL_OBSTRUCTION,
                "Central Skyscraper", 5, 0, 5, 8, 40, 8));
        session.addMapObject(new MapObject("cz-1", MapObjectType.CONSTRUCTION_ZONE,
                "Roadworks (West Ave)", -35, 0, 5, 12, 1, 12));
    }

    private void node(GameSession session, String id, String name, NodeType type,
                      double x, double y, double z) {
        session.addNode(new NetworkNode(id, name, type, x, y, z));
    }

    private void link(GameSession session, String id, String sourceId, String targetId, LinkType type) {
        NetworkLink link = new NetworkLink(id, sourceId, targetId, type, capacityFor(type));
        double latency = baseLatencyFor(type);
        link.setBaseLatencyMs(latency);
        link.setCurrentLatencyMs(latency);
        link.setPacketLossRate(packetLossFor(type));
        // currentLoad defaults to 0.0
        session.addLink(link);
    }

    private double capacityFor(LinkType type) {
        return switch (type) {
            case FIBRE -> 120;
            case MMWAVE -> 90;
            case MICROWAVE -> 70;
            case RADIO -> 60;
            case SATELLITE -> 50;
            case LEGACY -> 40;
        };
    }

    private double baseLatencyFor(LinkType type) {
        return switch (type) {
            case FIBRE -> 4;
            case MMWAVE -> 6;
            case MICROWAVE -> 9;
            case RADIO -> 10;
            case LEGACY -> 30;
            case SATELLITE -> 130;
        };
    }

    private double packetLossFor(LinkType type) {
        return switch (type) {
            case FIBRE -> 0.001;
            case MICROWAVE, RADIO -> 0.01;
            case MMWAVE, LEGACY -> 0.02;
            case SATELLITE -> 0.03;
        };
    }
}
