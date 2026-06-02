package com.packetquest.repository;

import com.packetquest.model.GameSession;
import com.packetquest.persistence.GamePersistenceService;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.concurrent.ConcurrentHashMap;

/**
 * In-memory store for live {@link GameSession} aggregates, keyed by session id.
 *
 * <p>The live match aggregate stays in memory for responsive gameplay. When the
 * optional persistence layer is available, every save also writes an
 * assessor-visible MySQL snapshot containing sessions, topology, packet flows,
 * incidents, scores, and status.
 */
@Repository
public class GameSessionRepository {

    private final ConcurrentHashMap<String, GameSession> store = new ConcurrentHashMap<>();
    private final GamePersistenceService persistenceService;

    public GameSessionRepository() {
        this.persistenceService = null;
    }

    @Autowired
    public GameSessionRepository(ObjectProvider<GamePersistenceService> persistenceProvider) {
        this.persistenceService = persistenceProvider.getIfAvailable();
    }

    public GameSession save(GameSession session) {
        store.put(session.getId(), session);
        if (persistenceService != null) {
            persistenceService.saveSnapshot(session);
        }
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
