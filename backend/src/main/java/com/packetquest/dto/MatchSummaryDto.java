package com.packetquest.dto;

import com.packetquest.model.GameDifficulty;
import com.packetquest.model.SessionStatus;

import java.time.Instant;

/** Compact database-backed summary for a completed match. */
public record MatchSummaryDto(
        String sessionId,
        SessionStatus status,
        GameDifficulty difficulty,
        String mapFamily,
        int currentRound,
        int playerCount,
        int packetFlowCount,
        int deliveredPackets,
        int droppedPackets,
        int incidentCount,
        int scoreTotal,
        String winnerName,
        int winnerScore,
        Instant updatedAt
) {
}
