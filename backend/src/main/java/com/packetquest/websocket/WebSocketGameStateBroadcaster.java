package com.packetquest.websocket;

import com.packetquest.dto.GameStateDto;
import com.packetquest.service.GameStateBroadcaster;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.stereotype.Component;

/**
 * Default {@link GameStateBroadcaster} that serialises the state to JSON and
 * broadcasts it to all clients connected to the session's WebSocket topic.
 */
@Component
public class WebSocketGameStateBroadcaster implements GameStateBroadcaster {

    private final GameWebSocketHandler handler;
    private final ObjectMapper objectMapper;

    public WebSocketGameStateBroadcaster(GameWebSocketHandler handler, ObjectMapper objectMapper) {
        this.handler = handler;
        this.objectMapper = objectMapper;
    }

    @Override
    public void broadcast(String sessionId, GameStateDto state) {
        try {
            handler.broadcast(sessionId, objectMapper.writeValueAsString(state));
        } catch (Exception ignored) {
            // Broadcasting is best-effort; never fail a tick because of it.
        }
    }
}
