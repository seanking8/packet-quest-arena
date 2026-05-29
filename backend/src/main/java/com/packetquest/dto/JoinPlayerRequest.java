package com.packetquest.dto;

import jakarta.validation.constraints.NotBlank;

/** Request body for joining a session as a new player. */
public record JoinPlayerRequest(
        @NotBlank(message = "must not be blank") String displayName
) {
}
