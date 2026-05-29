package com.packetquest.repository;

import com.packetquest.model.GameSession;
import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * Unit tests for the in-memory {@link GameSessionRepository}. No Spring context
 * or database — the repository is exercised as a plain ConcurrentHashMap store.
 */
class GameSessionRepositoryTest {

    @Test
    void save_thenFindById_returnsSameSession() {
        GameSessionRepository repo = new GameSessionRepository();
        GameSession session = new GameSession();

        repo.save(session);

        assertThat(repo.findById(session.getId()))
                .isPresent()
                .containsSame(session);
        assertThat(repo.existsById(session.getId())).isTrue();
        assertThat(repo.count()).isEqualTo(1);
    }

    @Test
    void findById_unknownId_returnsEmpty() {
        GameSessionRepository repo = new GameSessionRepository();

        assertThat(repo.findById("does-not-exist")).isEmpty();
        assertThat(repo.existsById("does-not-exist")).isFalse();
    }

    @Test
    void save_isIdempotentPerId_andDeleteRemoves() {
        GameSessionRepository repo = new GameSessionRepository();
        GameSession session = new GameSession();

        repo.save(session);
        repo.save(session); // same id -> still one entry

        assertThat(repo.count()).isEqualTo(1);

        repo.deleteById(session.getId());

        assertThat(repo.count()).isZero();
        assertThat(repo.findById(session.getId())).isEmpty();
    }

    @Test
    void findAll_returnsAllStoredSessions() {
        GameSessionRepository repo = new GameSessionRepository();
        repo.save(new GameSession());
        repo.save(new GameSession());

        assertThat(repo.findAll()).hasSize(2);
    }
}
