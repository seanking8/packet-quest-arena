package com.packetquest.dto;

/** Per-player result in a persisted match report. */
public record PlayerReportDto(
        String playerId,
        String displayName,
        String color,
        int score,
        int deliveredPackets,
        int droppedPackets
) {
}
