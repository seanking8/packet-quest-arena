package com.packetquest.service;

import com.packetquest.model.GameSession;
import com.packetquest.model.LinkType;
import com.packetquest.model.MapObject;
import com.packetquest.model.MapObjectType;
import com.packetquest.model.NetworkLink;
import com.packetquest.model.NetworkNode;
import com.packetquest.model.NodeStatus;
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

    // Stable node ids, referenced when defining both the nodes and the links
    // between them. Kept as constants so each id has a single source of truth.
    private static final String RU_NORTH = "ru-north";
    private static final String RU_SOUTH = "ru-south";
    private static final String RU_EAST = "ru-east";
    private static final String RU_WEST = "ru-west";
    private static final String ORU_CENTRAL = "oru-central";
    private static final String SC_PLAZA = "sc-plaza";
    private static final String ODU_1 = "odu-1";
    private static final String ODU_2 = "odu-2";
    private static final String OCU_1 = "ocu-1";
    private static final String EDGE_1 = "edge-1";
    private static final String UPF_1 = "upf-1";
    private static final String CORE_1 = "core-1";
    private static final String SAT_1 = "sat-1";
    private static final String SAT_2 = "sat-2";

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
        // Radio access across a wider metro/region map.
        node(session, RU_NORTH, "North Suburb Cell Tower", NodeType.RADIO_TOWER, -70, 3, 85);
        node(session, RU_SOUTH, "South Hospital Macro Tower", NodeType.RADIO_TOWER, -65, 3, -90);
        node(session, RU_EAST, "Airport District Cell Tower", NodeType.RADIO_TOWER, 95, 3, 70);
        node(session, RU_WEST, "Remote Hill Radio Tower", NodeType.RADIO_TOWER, -135, 3, 5);
        node(session, ORU_CENTRAL, "Downtown Rooftop O-RU", NodeType.O_RU, -20, 2, 10);

        // Small cells on/near buildings.
        node(session, SC_PLAZA, "City Plaza Small Cell", NodeType.SMALL_CELL, -35, 2, 48);
        node(session, "sc-market", "Market Quarter Small Cell", NodeType.SMALL_CELL, 5, 2, 58);
        node(session, "sc-harbor", "Harbor Small Cell", NodeType.SMALL_CELL, 35, 2, -82);

        // Aggregation / control.
        node(session, ODU_1, "North Aggregation Hub", NodeType.O_DU, -4, 1, 35);
        node(session, ODU_2, "South Aggregation Hub", NodeType.O_DU, -5, 1, -38);
        node(session, OCU_1, "Metro O-CU Control Centre", NodeType.O_CU, 42, 1, 8);

        // Core transport chain.
        node(session, EDGE_1, "East Edge Data Centre", NodeType.EDGE, 76, 1, 45);
        node(session, UPF_1, "Carrier UPF Gateway", NodeType.UPF, 86, 1, 0);
        node(session, CORE_1, "Core Network Campus", NodeType.CORE, 118, 1, -5);
        node(session, "dc-1", "Regional Cloud Data Centre", NodeType.DATA_CENTRE, 150, 1, 38);

        // Fixed satellite relays high above the city.
        node(session, SAT_1, "Emergency Satellite Alpha", NodeType.SATELLITE, -25, 95, -25);
        node(session, SAT_2, "Emergency Satellite Beta", NodeType.SATELLITE, 115, 105, 35);
    }

    private void addLinks(GameSession session) {
        // RADIO: access towers into the network.
        link(session, "l-runorth-oru", RU_NORTH, ORU_CENTRAL, LinkType.RADIO);
        link(session, "l-rusouth-oru", RU_SOUTH, ORU_CENTRAL, LinkType.RADIO);
        link(session, "l-ruwest-oru", RU_WEST, ORU_CENTRAL, LinkType.RADIO);
        link(session, "l-rueast-ocu", RU_EAST, OCU_1, LinkType.RADIO);

        // MMWAVE: small cells, high capacity / short reach.
        link(session, "l-scplaza-oru", SC_PLAZA, ORU_CENTRAL, LinkType.MMWAVE);
        link(session, "l-scplaza-runorth", SC_PLAZA, RU_NORTH, LinkType.MMWAVE);
        link(session, "l-scmarket-ocu", "sc-market", OCU_1, LinkType.MMWAVE);
        link(session, "l-scharbor-ocu", "sc-harbor", OCU_1, LinkType.MMWAVE);

        // MICROWAVE: tower-to-tower backhaul.
        link(session, "l-runorth-rueast", RU_NORTH, RU_EAST, LinkType.MICROWAVE);
        link(session, "l-ruwest-rusouth", RU_WEST, RU_SOUTH, LinkType.MICROWAVE);

        // FIBRE: O-DU / O-CU / edge / UPF / core transport.
        link(session, "l-oru-odu1", ORU_CENTRAL, ODU_1, LinkType.FIBRE);
        link(session, "l-oru-odu2", ORU_CENTRAL, ODU_2, LinkType.FIBRE);
        link(session, "l-odu1-ocu", ODU_1, OCU_1, LinkType.FIBRE);
        link(session, "l-odu2-ocu", ODU_2, OCU_1, LinkType.FIBRE);
        link(session, "l-ocu-edge", OCU_1, EDGE_1, LinkType.FIBRE);
        link(session, "l-ocu-upf", OCU_1, UPF_1, LinkType.FIBRE);
        link(session, "l-edge-upf", EDGE_1, UPF_1, LinkType.FIBRE);
        link(session, "l-upf-core", UPF_1, CORE_1, LinkType.FIBRE);
        link(session, "l-core-dc", CORE_1, "dc-1", LinkType.FIBRE);

        // LEGACY: reliable backups, higher latency / lower capacity.
        link(session, "l-runorth-odu1", RU_NORTH, ODU_1, LinkType.LEGACY);
        link(session, "l-odu1-odu2", ODU_1, ODU_2, LinkType.LEGACY);

        // SATELLITE: high-latency wide-area backup paths.
        link(session, "l-sat1-rusouth", SAT_1, RU_SOUTH, LinkType.SATELLITE);
        link(session, "l-sat1-core", SAT_1, CORE_1, LinkType.SATELLITE);
        link(session, "l-sat2-rueast", SAT_2, RU_EAST, LinkType.SATELLITE);
        link(session, "l-sat2-dc", SAT_2, "dc-1", LinkType.SATELLITE);
    }

    /** A few lightweight decorative / obstruction objects for the 3D city. */
    private void addMapObjects(GameSession session) {
        session.addMapObject(new MapObject("bld-1", MapObjectType.DECORATIVE_BUILDING,
                "Downtown Office Block", -18, 0, 28, 12, 18, 10));
        session.addMapObject(new MapObject("bld-2", MapObjectType.DECORATIVE_BUILDING,
                "North Apartments", -48, 0, 70, 14, 12, 12));
        session.addMapObject(new MapObject("bld-3", MapObjectType.DECORATIVE_BUILDING,
                "Market Hall", 8, 0, 48, 18, 7, 14));
        session.addMapObject(new MapObject("bld-4", MapObjectType.DECORATIVE_BUILDING,
                "Airport Terminal", 82, 0, 88, 28, 9, 16));
        session.addMapObject(new MapObject("bld-5", MapObjectType.DECORATIVE_BUILDING,
                "Harbor Warehouse", 30, 0, -65, 28, 8, 18));
        session.addMapObject(new MapObject("bld-6", MapObjectType.DECORATIVE_BUILDING,
                "Core Operations Hall", 120, 0, -22, 28, 12, 18));
        session.addMapObject(new MapObject("obs-1", MapObjectType.TALL_OBSTRUCTION,
                "Central Skyscraper", 18, 0, 15, 12, 48, 12));
        session.addMapObject(new MapObject("obs-2", MapObjectType.TALL_OBSTRUCTION,
                "Hospital Tower", -75, 0, -72, 14, 34, 14));
        session.addMapObject(new MapObject("cz-1", MapObjectType.CONSTRUCTION_ZONE,
                "Roadworks (West Ave)", -95, 0, 15, 24, 1, 16));
        session.addMapObject(new MapObject("cz-2", MapObjectType.CONSTRUCTION_ZONE,
                "Harbor Fibre Works", 12, 0, -52, 22, 1, 12));
    }

    private void node(GameSession session, String id, String name, NodeType type,
                      double x, double y, double z) {
        session.addNode(new NetworkNode(id, name, type, x, y, z));
    }

    /**
     * Reset the existing network to a clean baseline for a new round, keeping
     * the same map. Links go back to healthy with zero load, their capacity
     * scaled by {@code capacityFactor} (lower = congests faster); nodes go
     * healthy. Incidents/packets are cleared by the caller.
     */
    public void resetForRound(GameSession session, double capacityFactor) {
        for (NetworkLink link : session.getLinks()) {
            double latency = baseLatencyFor(link.getLinkType());
            link.setCapacity(capacityFor(link.getLinkType()) * capacityFactor);
            link.setCurrentLoad(0.0);
            link.setBaseLatencyMs(latency);
            link.setCurrentLatencyMs(latency);
            link.setPacketLossRate(packetLossFor(link.getLinkType()));
            link.recomputeStatus();
        }
        for (NetworkNode node : session.getNodes()) {
            node.setStatus(NodeStatus.HEALTHY);
            node.setLatencyMultiplier(1.0);
            node.setPacketLossRate(0.0);
        }
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
