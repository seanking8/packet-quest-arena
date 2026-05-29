package com.packetquest.controller;

import com.packetquest.dto.RouteResultResponse;
import com.packetquest.dto.RouteSubmissionRequest;
import com.packetquest.service.RoutingService;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

/**
 * In-game player actions.
 *
 * <pre>
 * POST /api/sessions/{sessionId}/actions/route  submit a route for a packet
 * </pre>
 */
@RestController
@RequestMapping("/api/sessions/{sessionId}/actions")
public class ActionController {

    private final RoutingService routingService;

    public ActionController(RoutingService routingService) {
        this.routingService = routingService;
    }

    @PostMapping("/route")
    public ResponseEntity<RouteResultResponse> route(
            @PathVariable String sessionId,
            @Valid @RequestBody RouteSubmissionRequest request) {
        return ResponseEntity.ok(routingService.submitRoute(sessionId, request));
    }
}
