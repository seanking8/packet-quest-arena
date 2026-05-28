package com.packetquest.websocket;

import org.springframework.stereotype.Component;
import org.springframework.web.socket.*;
import org.springframework.web.socket.handler.TextWebSocketHandler;

import java.util.*;
import java.util.concurrent.ConcurrentHashMap;

@Component
public class GameWebSocketHandler extends TextWebSocketHandler {

    // sessionId -> connected clients
    private final Map<String, List<WebSocketSession>> sessions = new ConcurrentHashMap<>();

    @Override
    public void afterConnectionEstablished(WebSocketSession session) {
        String sessionId = extractSessionId(session);
        sessions.computeIfAbsent(sessionId, k -> Collections.synchronizedList(new ArrayList<>())).add(session);
    }

    @Override
    public void afterConnectionClosed(WebSocketSession session, CloseStatus status) {
        String sessionId = extractSessionId(session);
        Optional.ofNullable(sessions.get(sessionId)).ifPresent(list -> list.remove(session));
    }

    public void broadcast(String sessionId, String message) {
        List<WebSocketSession> clients = sessions.getOrDefault(sessionId, List.of());
        for (WebSocketSession client : clients) {
            try {
                if (client.isOpen()) client.sendMessage(new TextMessage(message));
            } catch (Exception ignored) {}
        }
    }

    private String extractSessionId(WebSocketSession session) {
        String path = session.getUri().getPath();
        return path.substring(path.lastIndexOf('/') + 1);
    }
}
