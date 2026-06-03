package com.packetquest.dto;

/** Aggregate leaderboard row computed from persisted completed matches. */
public record LeaderboardEntryDto(
        String playerName,
        int totalScore,
        int wins,
        int matches,
        int deliveredPackets,
        int droppedPackets,
        int bestScore,
        double averageScore
) {
}
