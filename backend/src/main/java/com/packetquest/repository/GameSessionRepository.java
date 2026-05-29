package com.packetquest.repository;

import com.packetquest.model.GameSession;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.concurrent.ConcurrentHashMap;

/**
 * In-memory store for live {@link GameSession} aggregates, keyed by session id.
 *
 * <p>Game state is intentionally NOT persisted to the relational database — the
 * backend owns match truth in memory for the duration of a match. A
 * {@link ConcurrentHashMap} provides safe concurrent access from REST and
 * WebSocket threads.
 */
@Repository
public class GameSessionRepository {

    private final ConcurrentHashMap<String, GameSession> store = new ConcurrentHashMap<>();

    public GameSession save(GameSession session) {
        store.put(session.getId(), session);
        return session;
    }

    public Optional<GameSession> findById(String id) {
        return Optional.ofNullable(store.get(id));
    }

    public List<GameSession> findAll() {
        return List.copyOf(store.values());
    }

    public boolean existsById(String id) {
        return store.containsKey(id);
    }

    public void deleteById(String id) {
        store.remove(id);
    }

    public void deleteAll() {
        store.clear();
    }

    public long count() {
        return store.size();
    }
}
