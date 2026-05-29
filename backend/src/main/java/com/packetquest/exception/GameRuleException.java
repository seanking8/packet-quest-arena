package com.packetquest.exception;

/**
 * Thrown when a request is well-formed but violates a game rule (e.g. joining a
 * started session, starting with too few players, exceeding the player cap).
 * Maps to HTTP 409 Conflict.
 */
public class GameRuleException extends RuntimeException {

    public GameRuleException(String message) {
        super(message);
    }
}
