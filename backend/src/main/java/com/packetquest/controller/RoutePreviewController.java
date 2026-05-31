package com.packetquest.controller;

import com.packetquest.dto.RoutePreviewResponse;
import com.packetquest.dto.RouteSubmissionRequest;
import com.packetquest.service.RoutingService;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

/**
 * Read-only route preview.
 *
 * <pre>
 * POST /api/sessions/{sessionId}/routes/preview  estimate latency/risk/score
 * </pre>
 *
 * <p>Does not change game state. The authoritative result still comes from
 * {@code POST /actions/route}.
 */
@RestController
@RequestMapping("/api/sessions/{sessionId}/routes")
public class RoutePreviewController {

    private final RoutingService routingService;

    public RoutePreviewController(RoutingService routingService) {
        this.routingService = routingService;
    }

    @PostMapping("/preview")
    public ResponseEntity<RoutePreviewResponse> preview(
            @PathVariable String sessionId,
            @Valid @RequestBody RouteSubmissionRequest request) {
        return ResponseEntity.ok(routingService.previewRoute(sessionId, request));
    }
}
