package com.packetquest.dto;

/** Optional request body for starting a session with the host's chosen map. */
public record StartSessionRequest(
        String mapFamily
) {
}
