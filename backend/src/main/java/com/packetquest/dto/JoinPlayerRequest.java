package com.packetquest.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

/** Request body for joining a session as a new player. */
public record JoinPlayerRequest(
        @NotBlank(message = "must not be blank")
        @Size(max = 32, message = "must be at most 32 characters")
        String displayName
) {
}
