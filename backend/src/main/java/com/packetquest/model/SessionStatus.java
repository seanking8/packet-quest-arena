package com.packetquest.model;

/** Lifecycle of a {@link GameSession}. */
public enum SessionStatus {
    WAITING,
    ACTIVE,
    /** A round ended; standings shown, world frozen, waiting for the host to
        start the next round. */
    INTERMISSION,
    COMPLETED
}
