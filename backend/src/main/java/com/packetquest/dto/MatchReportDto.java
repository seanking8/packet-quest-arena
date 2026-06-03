package com.packetquest.dto;

import com.packetquest.model.GameDifficulty;
import com.packetquest.model.SessionStatus;

import java.time.Instant;
import java.util.List;

/** Post-game report reconstructed from the persisted match snapshot and audit trail. */
public record MatchReportDto(
        String sessionId,
        SessionStatus status,
        GameDifficulty difficulty,
        String mapFamily,
        int playerCount,
        int packetFlowCount,
        int deliveredPackets,
        int droppedPackets,
        int totalScore,
        String winnerName,
        int winnerScore,
        int routeActions,
        int incidentEvents,
        double averageLatencyMs,
        String highlight,
        Instant updatedAt,
        List<PlayerReportDto> players,
        List<TimelineEventDto> timeline
) {
}
