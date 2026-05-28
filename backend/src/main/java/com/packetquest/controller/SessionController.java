package com.packetquest.controller;

import com.packetquest.dto.GameStateResponse;
import com.packetquest.dto.RouteActionRequest;
import com.packetquest.dto.SessionJoinResponse;
import com.packetquest.service.GameService;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/sessions")
public class SessionController {

    private final GameService gameService;

    public SessionController(GameService gameService) {
        this.gameService = gameService;
    }

    record CreateRequest(@NotBlank String playerName) {}
    record JoinRequest(@NotBlank String playerName) {}

    @PostMapping
    public ResponseEntity<SessionJoinResponse> create(@Valid @RequestBody CreateRequest req) {
        return ResponseEntity.ok(gameService.createSession(req.playerName()));
    }

    @PostMapping("/{sessionId}/join")
    public ResponseEntity<SessionJoinResponse> join(
            @PathVariable String sessionId,
            @Valid @RequestBody JoinRequest req) {
        return ResponseEntity.ok(gameService.joinSession(sessionId, req.playerName()));
    }

    @GetMapping("/{id}/state")
    public GameStateResponse getState(@PathVariable String id) {
        return gameService.getGameState(id);
    }

    @PostMapping("/{id}/actions/route")
    public GameStateResponse routeFlow(
            @PathVariable String id,
            @Valid @RequestBody RouteActionRequest req) {
        return gameService.routeFlow(id, req);
    }
}