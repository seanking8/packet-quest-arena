package com.packetquest.model;

/** Type of an {@link IncidentEvent} (weather and non-weather incidents). */
public enum IncidentType {
    NODE_FAILURE,
    NODE_DEGRADED,
    LINK_FAILURE,
    LINK_CONGESTION,
    PACKET_LOSS_SPIKE,
    LATENCY_SPIKE,
    TRAFFIC_SURGE,
    WEATHER_ELECTRICAL_STORM,
    WEATHER_HIGH_WINDS,
    WEATHER_CLEAR,
    BUILDING_OBSTRUCTION,
    FIBRE_CUT,
    POWER_OUTAGE,
    RECOVERY,
    CONSTRUCTION
}
