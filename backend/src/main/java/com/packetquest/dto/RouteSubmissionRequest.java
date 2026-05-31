package com.packetquest.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

import java.util.List;

/**
 * Route submission from the client. The client supplies ONLY these fields —
 * never score, latency, delivery result or link load. Those are computed by the
 * authoritative backend. The path is bounded so a malformed or malicious client
 * cannot submit an unbounded list of node ids.
 */
public record RouteSubmissionRequest(
        @NotBlank String playerId,
        @NotBlank String packetFlowId,
        @NotNull
        @Size(min = 2, max = 64, message = "must contain between 2 and 64 nodes")
        List<@NotBlank String> path
) {
}
