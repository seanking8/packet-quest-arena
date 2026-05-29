package com.packetquest.controller;

import com.packetquest.dto.GameStateDto;
import com.packetquest.dto.IncidentSubmissionRequest;
import com.packetquest.service.IncidentService;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

/**
 * Receives incidents (from the Python simulator) and applies them to a session.
 *
 * <pre>
 * POST /api/sessions/{sessionId}/incidents
 * </pre>
 */
@RestController
@RequestMapping("/api/sessions/{sessionId}/incidents")
public class IncidentController {

    private final IncidentService incidentService;

    public IncidentController(IncidentService incidentService) {
        this.incidentService = incidentService;
    }

    @PostMapping
    public ResponseEntity<GameStateDto> apply(
            @PathVariable String sessionId,
            @Valid @RequestBody IncidentSubmissionRequest request) {
        return ResponseEntity.ok(incidentService.applyIncident(sessionId, request));
    }
}
