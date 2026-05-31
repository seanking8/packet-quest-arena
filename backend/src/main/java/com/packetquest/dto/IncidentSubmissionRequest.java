package com.packetquest.dto;

import com.packetquest.model.IncidentType;
import com.packetquest.model.LinkType;
import com.packetquest.model.VisualZone;
import jakarta.validation.constraints.DecimalMax;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

import java.util.List;

/**
 * Incident submitted by the Python simulator (or an admin tool). Matches the
 * simulator's JSON shape. The backend validates and applies it — simulator
 * input is never trusted blindly. Severity, duration and message are bounded at
 * the API edge; {@code IncidentService} re-checks them as defence in depth.
 */
public record IncidentSubmissionRequest(
        @NotNull IncidentType eventType,
        String targetType,
        String targetId,
        @DecimalMin(value = "0.0", message = "must be between 0.0 and 1.0")
        @DecimalMax(value = "1.0", message = "must be between 0.0 and 1.0")
        double severity,
        @Min(value = 0, message = "must be between 0 and 300")
        @Max(value = 300, message = "must be between 0 and 300")
        int durationSeconds,
        @Size(max = 200, message = "must be at most 200 characters")
        String message,
        List<LinkType> affectedLinkTypes,
        List<String> affectedNodeIds,
        List<String> affectedLinkIds,
        VisualZone visualZone
) {
}
