package com.packetquest.service;

import com.packetquest.config.TrafficProfiles;
import com.packetquest.dto.GameStateDto;
import com.packetquest.exception.GameRuleException;
import com.packetquest.exception.SessionNotFoundException;
import com.packetquest.model.GameDifficulty;
import com.packetquest.model.GameSession;
import com.packetquest.model.Player;
import com.packetquest.model.SessionStatus;
import com.packetquest.repository.GameSessionRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import java.util.ArrayList;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

/**
 * Service-level tests for the session/multiplayer flow. Wires the real
 * in-memory repository and factories — no Spring context or database.
 */
class GameServiceTest {

    private GameService service;
    private GameSessionRepository repo;

    @BeforeEach
    void setUp() {
        repo = new GameSessionRepository();
        service = new GameService(repo, new TopologyGeneratorService(),
                new PacketFlowGenerationService(new TrafficProfiles()),
                (id, state) -> { /* no-op broadcaster */ });
    }

    @Test
    void createSession_startsEmptyAndWaiting() {
        GameSession session = service.createSession();

        assertThat(session.getStatus()).isEqualTo(SessionStatus.WAITING);
        assertThat(session.getDifficulty()).isEqualTo(GameDifficulty.MEDIUM);
        assertThat(session.getPlayers()).isEmpty();
    }

    @Test
    void createSession_acceptsDifficulty() {
        GameSession session = service.createSession(GameDifficulty.EASY);

        assertThat(session.getDifficulty()).isEqualTo(GameDifficulty.EASY);
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
        // A match now starts in round 1, which runs for a fixed round length.
        assertThat(state.remainingSeconds()).isEqualTo(GameSession.ROUND_LENGTH_SECONDS);
        assertThat(state.currentRound()).isEqualTo(1);
        assertThat(state.difficulty()).isEqualTo(GameDifficulty.MEDIUM);
        assertThat(state.nodes()).isNotEmpty();
        assertThat(state.links()).isNotEmpty();
        // INITIAL_JOBS_PER_PLAYER jobs per player, 2 players
        assertThat(state.packetFlows())
                .hasSize(2 * PacketFlowGenerationService.INITIAL_JOBS_PER_PLAYER);
        assertThat(state.serverTime()).isNotNull();
    }

    @Test
    void startSession_withDistrictMapFamily_storesSelection() {
        String id = service.createSession().getId();
        service.joinPlayer(id, "Alice");
        service.joinPlayer(id, "Bob");

        GameStateDto state = service.startSession(id, "DISTRICT");

        assertThat(state.mapFamily()).isEqualTo("DISTRICT");
        assertThat(service.getState(id).mapFamily()).isEqualTo("DISTRICT");
    }

    @Test
    void nextRound_advancesRoundAndKeepsScores() {
        String id = service.createSession().getId();
        service.joinPlayer(id, "Alice");
        service.joinPlayer(id, "Bob");
        service.startSession(id);

        GameSession session = repo.findById(id).orElseThrow();
        session.getPlayers().get(0).addScore(150); // banked points from round 1
        session.endRound(java.time.Instant.now());  // simulate the round timer ending

        GameStateDto state = service.nextRound(id);

        assertThat(state.status()).isEqualTo(SessionStatus.ACTIVE);
        assertThat(state.currentRound()).isEqualTo(2);
        assertThat(state.remainingSeconds()).isEqualTo(GameSession.ROUND_LENGTH_SECONDS);
        // Scores carry over across rounds.
        assertThat(state.players().get(0).getScore()).isEqualTo(150);
        // Fresh jobs generated for the new round.
        assertThat(state.packetFlows()).isNotEmpty();
    }

    @Test
    void nextRound_whenNotInIntermission_isRejected() {
        String id = service.createSession().getId();
        service.joinPlayer(id, "Alice");
        service.joinPlayer(id, "Bob");
        service.startSession(id); // still ACTIVE, round 1

        assertThatThrownBy(() -> service.nextRound(id))
                .isInstanceOf(GameRuleException.class)
                .hasMessageContaining("intermission");
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

    @Test
    void joinAndStart_broadcastUpdatedState() {
        List<String> broadcasts = new ArrayList<>();
        GameService svc = new GameService(new GameSessionRepository(), new TopologyGeneratorService(),
                new PacketFlowGenerationService(new TrafficProfiles()),
                (id, state) -> broadcasts.add(id));
        String id = svc.createSession().getId();

        svc.joinPlayer(id, "Alice");
        svc.joinPlayer(id, "Bob");
        svc.startSession(id);

        // a broadcast per join + one for start
        assertThat(broadcasts).containsExactly(id, id, id);
    }
}
