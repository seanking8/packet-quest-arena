package com.packetquest.dto;

import com.packetquest.model.Player;

/** Response returned after a player joins: the new player plus updated state. */
public record JoinPlayerResponse(
        Player player,
        GameStateDto state
) {
}
