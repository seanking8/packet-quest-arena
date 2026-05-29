package com.packetquest.dto;

import com.packetquest.model.SessionStatus;

/** Response returned when a new session is created. */
public record CreateSessionResponse(
        String sessionId,
        SessionStatus status
) {
}
