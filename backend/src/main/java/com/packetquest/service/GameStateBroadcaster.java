package com.packetquest.service;

import com.packetquest.dto.GameStateDto;

/**
 * Hook for pushing updated game state to connected clients (e.g. over
 * WebSocket). Kept as an interface so services can depend on it without
 * coupling to the transport, and tests can supply a no-op.
 */
public interface GameStateBroadcaster {

    void broadcast(String sessionId, GameStateDto state);
}
