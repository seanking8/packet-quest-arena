package com.packetquest.exception;

import java.time.Instant;

/** Consistent error body returned by {@link GlobalExceptionHandler}. */
public record ErrorResponse(
        int status,
        String error,
        String message,
        Instant timestamp
) {
    public static ErrorResponse of(int status, String error, String message) {
        return new ErrorResponse(status, error, message, Instant.now());
    }
}
