package com.packetquest.dto;

import java.time.Instant;
import java.util.List;

/** Replay-friendly event built from persisted action and traffic audit rows. */
public record TimelineEventDto(
        Instant at,
        String type,
        String actor,
        String subjectId,
        String summary,
        Integer scoreDelta,
        Double latencyMs,
        String resultStatus,
        List<String> path
) {
}
