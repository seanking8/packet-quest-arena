package com.packetquest.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

import java.util.List;

/**
 * Route submission from the client. The client supplies ONLY these fields —
 * never score, latency, delivery result or link load. Those are computed by the
 * authoritative backend.
 */
public record RouteSubmissionRequest(
        @NotBlank String playerId,
        @NotBlank String packetFlowId,
        @NotNull List<String> path
) {
}
