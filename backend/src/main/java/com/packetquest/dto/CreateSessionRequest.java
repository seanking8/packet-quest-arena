package com.packetquest.dto;

import com.packetquest.model.GameDifficulty;

/** Optional request body for creating a session with a chosen difficulty. */
public record CreateSessionRequest(
        GameDifficulty difficulty
) {
}
