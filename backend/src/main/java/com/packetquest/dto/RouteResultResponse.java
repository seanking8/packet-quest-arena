package com.packetquest.dto;

import com.packetquest.model.PacketStatus;

/**
 * Result of a route submission: a human-readable message, the backend-decided
 * packet status, the computed latency and score delta, and the updated state.
 */
public record RouteResultResponse(
        String message,
        PacketStatus packetStatus,
        double latencyMs,
        int scoreDelta,
        GameStateDto state
) {
}
