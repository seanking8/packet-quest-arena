package com.packetquest.service;

import com.packetquest.dto.GameStateDto;
import com.packetquest.exception.GameRuleException;
import com.packetquest.exception.SessionNotFoundException;
import com.packetquest.model.GameSession;
import com.packetquest.model.Player;
import com.packetquest.model.SessionStatus;
import com.packetquest.repository.GameSessionRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

/**
 * Service-level tests for the session/multiplayer flow. Wires the real
 * in-memory repository and factories — no Spring context or database.
 */
class GameServiceTest {

    private GameService service;

    @BeforeEach
    void setUp() {
        service = new GameService(new GameSessionRepository(), new TopologyFactory(), new PacketJobFactory());
    }

    @Test
    void createSession_startsEmptyAndWaiting() {
        GameSession session = service.createSession();

        assertThat(session.getStatus()).isEqualTo(SessionStatus.WAITING);
        assertThat(session.getPlayers()).isEmpty();
    }

    @Test
    void joinPlayer_assignsColorsInOrder() {
        String id = service.createSession().getId();

        Player p1 = service.joinPlayer(id, "Alice");
        Player p2 = service.joinPlayer(id, "Bob");
        Player p3 = service.joinPlayer(id, "Cara");
        Player p4 = service.joinPlayer(id, "Dan");

        assertThat(p1.getColor()).isEqualTo("blue");
        assertThat(p2.getColor()).isEqualTo("green");
        assertThat(p3.getColor()).isEqualTo("orange");
        assertThat(p4.getColor()).isEqualTo("purple");
        assertThat(p1.getDisplayName()).isEqualTo("Alice");
    }

    @Test
    void joinPlayer_fifthPlayer_isRejected() {
        String id = service.createSession().getId();
        service.joinPlayer(id, "Alice");
        service.joinPlayer(id, "Bob");
        service.joinPlayer(id, "Cara");
        service.joinPlayer(id, "Dan");

        assertThatThrownBy(() -> service.joinPlayer(id, "Eve"))
                .isInstanceOf(GameRuleException.class)
                .hasMessageContaining("full");
    }

    @Test
    void joinPlayer_unknownSession_throwsNotFound() {
        assertThatThrownBy(() -> service.joinPlayer("missing", "Alice"))
                .isInstanceOf(SessionNotFoundException.class);
    }

    @Test
    void startSession_withFewerThanTwoPlayers_isRejected() {
        String id = service.createSession().getId();
        service.joinPlayer(id, "Alice");

        assertThatThrownBy(() -> service.startSession(id))
                .isInstanceOf(GameRuleException.class)
                .hasMessageContaining("at least");
    }

    @Test
    void startSession_withTwoPlayers_activatesAndBuildsGame() {
        String id = service.createSession().getId();
        service.joinPlayer(id, "Alice");
        service.joinPlayer(id, "Bob");

        GameStateDto state = service.startSession(id);

        assertThat(state.status()).isEqualTo(SessionStatus.ACTIVE);
        assertThat(state.remainingSeconds()).isEqualTo(GameSession.DEFAULT_DURATION_SECONDS);
        assertThat(state.nodes()).isNotEmpty();
        assertThat(state.links()).isNotEmpty();
        // one job per traffic type, per player (3 types x 2 players)
        assertThat(state.packetFlows()).hasSize(6);
        assertThat(state.serverTime()).isNotNull();
    }

    @Test
    void joinPlayer_afterStart_isRejected() {
        String id = service.createSession().getId();
        service.joinPlayer(id, "Alice");
        service.joinPlayer(id, "Bob");
        service.startSession(id);

        assertThatThrownBy(() -> service.joinPlayer(id, "Cara"))
                .isInstanceOf(GameRuleException.class)
                .hasMessageContaining("WAITING");
    }

    @Test
    void startSession_twice_isRejected() {
        String id = service.createSession().getId();
        service.joinPlayer(id, "Alice");
        service.joinPlayer(id, "Bob");
        service.startSession(id);

        assertThatThrownBy(() -> service.startSession(id))
                .isInstanceOf(GameRuleException.class)
                .hasMessageContaining("already");
    }

    @Test
    void getState_unknownSession_throwsNotFound() {
        assertThatThrownBy(() -> service.getState("missing"))
                .isInstanceOf(SessionNotFoundException.class);
    }
}
