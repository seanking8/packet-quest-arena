package com.packetquest.controller;

import com.packetquest.dto.CreateSessionResponse;
import com.packetquest.dto.GameStateDto;
import com.packetquest.dto.JoinPlayerRequest;
import com.packetquest.dto.JoinPlayerResponse;
import com.packetquest.model.GameSession;
import com.packetquest.model.Player;
import com.packetquest.service.GameService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

/**
 * Session lifecycle and multiplayer join APIs.
 *
 * <pre>
 * POST /api/sessions                      create a WAITING session
 * POST /api/sessions/{sessionId}/players  join as a new player
 * POST /api/sessions/{sessionId}/start    start the match
 * GET  /api/sessions/{sessionId}/state    fetch backend-owned game state
 * </pre>
 */
@RestController
@RequestMapping("/api/sessions")
public class SessionController {

    private final GameService gameService;

    public SessionController(GameService gameService) {
        this.gameService = gameService;
    }

    @PostMapping
    public ResponseEntity<CreateSessionResponse> create() {
        GameSession session = gameService.createSession();
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(new CreateSessionResponse(session.getId(), session.getStatus()));
    }

    @PostMapping("/{sessionId}/players")
    public ResponseEntity<JoinPlayerResponse> join(
            @PathVariable String sessionId,
            @Valid @RequestBody JoinPlayerRequest request) {
        Player player = gameService.joinPlayer(sessionId, request.displayName());
        GameStateDto state = gameService.getState(sessionId);
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(new JoinPlayerResponse(player, state));
    }

    @PostMapping("/{sessionId}/start")
    public ResponseEntity<GameStateDto> start(@PathVariable String sessionId) {
        return ResponseEntity.ok(gameService.startSession(sessionId));
    }

    @GetMapping("/{sessionId}/state")
    public ResponseEntity<GameStateDto> state(@PathVariable String sessionId) {
        return ResponseEntity.ok(gameService.getState(sessionId));
    }
}
