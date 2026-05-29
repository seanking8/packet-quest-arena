package com.packetquest.exception;

/**
 * Thrown when a submitted route fails validation (bad path, disconnected nodes,
 * failed node/link, wrong owner, packet not routable, etc.).
 * Maps to HTTP 422 Unprocessable Entity.
 */
public class InvalidRouteException extends RuntimeException {

    public InvalidRouteException(String message) {
        super(message);
    }
}
