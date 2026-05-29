package com.packetquest.exception;

/** Thrown when a session id does not resolve to a live session. Maps to HTTP 404. */
public class SessionNotFoundException extends RuntimeException {

    public SessionNotFoundException(String sessionId) {
        super("Session not found: " + sessionId);
    }
}
