package com.packetquest.controller;

import com.packetquest.dto.LeaderboardEntryDto;
import com.packetquest.dto.MatchReportDto;
import com.packetquest.dto.MatchSummaryDto;
import com.packetquest.model.GameDifficulty;
import com.packetquest.service.MatchHistoryService;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

/** Database-backed match history, leaderboard, report, and replay APIs. */
@RestController
@RequestMapping("/api/history")
public class MatchHistoryController {

    private final ObjectProvider<MatchHistoryService> historyProvider;

    public MatchHistoryController(ObjectProvider<MatchHistoryService> historyProvider) {
        this.historyProvider = historyProvider;
    }

    @GetMapping("/matches")
    public ResponseEntity<List<MatchSummaryDto>> matches() {
        MatchHistoryService history = historyProvider.getIfAvailable();
        if (history == null) {
            return ResponseEntity.status(HttpStatus.SERVICE_UNAVAILABLE).body(List.of());
        }
        return ResponseEntity.ok(history.recentMatches());
    }

    @GetMapping("/leaderboard")
    public ResponseEntity<List<LeaderboardEntryDto>> leaderboard(
            @RequestParam(defaultValue = "MEDIUM") GameDifficulty difficulty) {
        MatchHistoryService history = historyProvider.getIfAvailable();
        if (history == null) {
            return ResponseEntity.status(HttpStatus.SERVICE_UNAVAILABLE).body(List.of());
        }
        return ResponseEntity.ok(history.leaderboard(difficulty));
    }

    @GetMapping("/matches/{sessionId}/report")
    public ResponseEntity<MatchReportDto> report(@PathVariable String sessionId) {
        MatchHistoryService history = historyProvider.getIfAvailable();
        if (history == null) {
            return ResponseEntity.status(HttpStatus.SERVICE_UNAVAILABLE).build();
        }
        return ResponseEntity.ok(history.report(sessionId));
    }
}
