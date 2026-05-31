package com.packetquest.dto;

import java.util.List;

/**
 * Read-only estimate for a candidate route. Computed with the same latency /
 * loss / scoring formulas the real submission uses, but without mutating link
 * load, packet status, or scores. The backend stays authoritative — this is an
 * advisory preview only; the final result comes from {@link RouteResultResponse}.
 */
public record RoutePreviewResponse(
        boolean valid,
        double estimatedLatencyMs,
        String packetLossRisk,
        List<String> warnings,
        ScoreRange estimatedScoreRange
) {

    /** Inclusive expected-score band: min if unlucky/dropped, max if delivered cleanly. */
    public record ScoreRange(int min, int max) {
    }

    public static RoutePreviewResponse valid(double latencyMs, String risk,
                                             List<String> warnings, ScoreRange range) {
        return new RoutePreviewResponse(true, latencyMs, risk, warnings, range);
    }

    /** A route that fails validation: not routable, with the reason as a warning. */
    public static RoutePreviewResponse invalid(String reason) {
        return new RoutePreviewResponse(false, 0, "HIGH", List.of(reason), new ScoreRange(0, 0));
    }
}
