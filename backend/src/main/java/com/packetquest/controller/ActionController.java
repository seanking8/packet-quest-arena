package com.packetquest.controller;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import java.util.Map;

@RestController
@RequestMapping("/api/sessions/{sessionId}/actions")
public class ActionController {

    @PostMapping
    public ResponseEntity<Map<String, String>> submitAction(
            @PathVariable String sessionId,
            @RequestBody Map<String, Object> action) {
        // TODO: validate and apply action via GameService
        return ResponseEntity.ok(Map.of("result", "accepted"));
    }
}
