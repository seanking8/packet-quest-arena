package com.packetquest.dto;

import com.packetquest.model.IncidentType;
import com.packetquest.model.LinkType;
import com.packetquest.model.VisualZone;
import jakarta.validation.constraints.NotNull;

import java.util.List;

/**
 * Incident submitted by the Python simulator (or an admin tool). Matches the
 * simulator's JSON shape. The backend validates and applies it — simulator
 * input is never trusted blindly.
 */
public record IncidentSubmissionRequest(
        @NotNull IncidentType eventType,
        String targetType,
        String targetId,
        double severity,
        int durationSeconds,
        String message,
        List<LinkType> affectedLinkTypes,
        List<String> affectedNodeIds,
        List<String> affectedLinkIds,
        VisualZone visualZone
) {
}
