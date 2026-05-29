package com.packetquest.model;

/**
 * A circular weather/incident zone on the city map, for the frontend to render.
 * Coordinates follow the topology convention (x/z on the ground plane).
 */
public record VisualZone(
        String id,
        double x,
        double z,
        double radius
) {
}
