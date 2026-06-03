package com.packetquest.service;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.packetquest.dto.GameStateDto;
import com.packetquest.dto.LeaderboardEntryDto;
import com.packetquest.dto.MatchReportDto;
import com.packetquest.dto.MatchSummaryDto;
import com.packetquest.dto.PlayerReportDto;
import com.packetquest.dto.TimelineEventDto;
import com.packetquest.exception.SessionNotFoundException;
import com.packetquest.model.GameDifficulty;
import com.packetquest.model.PacketFlow;
import com.packetquest.model.PacketStatus;
import com.packetquest.model.Player;
import com.packetquest.model.SessionStatus;
import com.packetquest.persistence.GameSessionSnapshotEntity;
import com.packetquest.persistence.GameSessionSnapshotJpaRepository;
import com.packetquest.persistence.PlayerActionAuditEntity;
import com.packetquest.persistence.PlayerActionAuditJpaRepository;
import com.packetquest.persistence.TrafficEventAuditEntity;
import com.packetquest.persistence.TrafficEventAuditJpaRepository;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.Comparator;
import java.util.HashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Optional;

/**
 * Turns persisted MySQL snapshots and audit rows into game-facing history,
 * leaderboard, report, and replay/timeline read models.
 */
@Service
@ConditionalOnProperty(name = "packetquest.persistence.enabled", havingValue = "true", matchIfMissing = true)
public class MatchHistoryService {

    private static final TypeReference<List<String>> STRING_LIST = new TypeReference<>() {
    };
    private static final TypeReference<Map<String, Object>> JSON_MAP = new TypeReference<>() {
    };

    private final GameSessionSnapshotJpaRepository snapshotRepo;
    private final PlayerActionAuditJpaRepository actionRepo;
    private final TrafficEventAuditJpaRepository eventRepo;
    private final ObjectMapper objectMapper;

    public MatchHistoryService(GameSessionSnapshotJpaRepository snapshotRepo,
                               PlayerActionAuditJpaRepository actionRepo,
                               TrafficEventAuditJpaRepository eventRepo,
                               ObjectMapper objectMapper) {
        this.snapshotRepo = snapshotRepo;
        this.actionRepo = actionRepo;
        this.eventRepo = eventRepo;
        this.objectMapper = objectMapper;
    }

    public List<MatchSummaryDto> recentMatches() {
        return snapshotRepo.findTop10ByStatusOrderByUpdatedAtDesc(SessionStatus.COMPLETED).stream()
                .map(this::toSummary)
                .toList();
    }

    public List<LeaderboardEntryDto> leaderboard(GameDifficulty difficulty) {
        Map<String, PlayerTotals> totals = new HashMap<>();
        GameDifficulty selectedDifficulty = difficulty != null ? difficulty : GameDifficulty.MEDIUM;
        for (GameSessionSnapshotEntity snapshot : snapshotRepo.findByStatusAndDifficultyOrderByUpdatedAtDesc(
                SessionStatus.COMPLETED, selectedDifficulty)) {
            Optional<GameStateDto> maybeState = readState(snapshot);
            if (maybeState.isEmpty()) {
                continue;
            }
            List<Player> players = maybeState.get().players();
            if (players == null || players.isEmpty()) {
                continue;
            }
            int winningScore = players.stream().mapToInt(Player::getScore).max().orElse(0);
            for (Player player : players) {
                String name = cleanName(player.getDisplayName());
                String key = name.toLowerCase(Locale.ROOT);
                totals.computeIfAbsent(key, ignored -> new PlayerTotals(name))
                        .add(player, player.getScore() == winningScore);
            }
        }
        return totals.values().stream()
                .map(PlayerTotals::toDto)
                .sorted(Comparator.comparingInt(LeaderboardEntryDto::totalScore).reversed()
                        .thenComparing(Comparator.comparingInt(LeaderboardEntryDto::wins).reversed())
                        .thenComparing(Comparator.comparingDouble(LeaderboardEntryDto::averageScore).reversed())
                        .thenComparing(LeaderboardEntryDto::playerName))
                .limit(10)
                .toList();
    }

    public MatchReportDto report(String sessionId) {
        GameSessionSnapshotEntity snapshot = snapshotRepo.findById(sessionId)
                .orElseThrow(() -> new SessionNotFoundException(sessionId));
        GameStateDto state = readState(snapshot).orElse(null);
        List<PlayerActionAuditEntity> actions = actionRepo.findBySessionIdOrderByCreatedAtAsc(sessionId);
        List<TrafficEventAuditEntity> events = eventRepo.findBySessionIdOrderByCreatedAtAsc(sessionId);
        Map<String, String> playerNames = playerNamesById(state);

        List<PlayerReportDto> players = playerReports(state);
        PlayerReportDto winner = players.stream()
                .max(Comparator.comparingInt(PlayerReportDto::score))
                .orElse(null);
        int delivered = deliveredPackets(state);
        int dropped = droppedPackets(state);
        int incidentEvents = (int) events.stream()
                .filter(event -> contains(event.getEventType(), "INCIDENT"))
                .count();

        List<TimelineEventDto> timeline = new ArrayList<>();
        actions.forEach(action -> timeline.add(actionTimeline(action, playerNames)));
        events.forEach(event -> timeline.add(eventTimeline(event, playerNames)));
        timeline.sort(Comparator.comparing(TimelineEventDto::at, Comparator.nullsLast(Comparator.naturalOrder())));

        return new MatchReportDto(
                snapshot.getSessionId(),
                snapshot.getStatus(),
                snapshot.getDifficulty(),
                snapshot.getMapFamily(),
                snapshot.getPlayerCount(),
                snapshot.getPacketFlowCount(),
                delivered,
                dropped,
                snapshot.getScoreTotal(),
                winner != null ? winner.displayName() : null,
                winner != null ? winner.score() : 0,
                actions.size(),
                incidentEvents,
                averageLatency(actions),
                highlight(winner, actions.size()),
                snapshot.getUpdatedAt(),
                players,
                timeline);
    }

    private MatchSummaryDto toSummary(GameSessionSnapshotEntity snapshot) {
        GameStateDto state = readState(snapshot).orElse(null);
        Player winner = winner(state);
        return new MatchSummaryDto(
                snapshot.getSessionId(),
                snapshot.getStatus(),
                snapshot.getDifficulty(),
                snapshot.getMapFamily(),
                snapshot.getCurrentRound(),
                snapshot.getPlayerCount(),
                snapshot.getPacketFlowCount(),
                deliveredPackets(state),
                droppedPackets(state),
                snapshot.getIncidentCount(),
                snapshot.getScoreTotal(),
                winner != null ? winner.getDisplayName() : null,
                winner != null ? winner.getScore() : 0,
                snapshot.getUpdatedAt());
    }

    private Optional<GameStateDto> readState(GameSessionSnapshotEntity snapshot) {
        if (snapshot.getStateJson() == null || snapshot.getStateJson().isBlank()) {
            return Optional.empty();
        }
        try {
            return Optional.of(objectMapper.readValue(snapshot.getStateJson(), GameStateDto.class));
        } catch (JsonProcessingException | RuntimeException ex) {
            return Optional.empty();
        }
    }

    private Player winner(GameStateDto state) {
        if (state == null || state.players() == null || state.players().isEmpty()) {
            return null;
        }
        return state.players().stream()
                .max(Comparator.comparingInt(Player::getScore))
                .orElse(null);
    }

    private int deliveredPackets(GameStateDto state) {
        if (state == null) {
            return 0;
        }
        int byPlayers = safePlayers(state).stream().mapToInt(Player::getDeliveredPackets).sum();
        if (byPlayers > 0) {
            return byPlayers;
        }
        return safeFlows(state).stream()
                .filter(flow -> flow.getStatus() == PacketStatus.DELIVERED)
                .mapToInt(flow -> 1)
                .sum();
    }

    private int droppedPackets(GameStateDto state) {
        if (state == null) {
            return 0;
        }
        int byPlayers = safePlayers(state).stream().mapToInt(Player::getDroppedPackets).sum();
        if (byPlayers > 0) {
            return byPlayers;
        }
        return safeFlows(state).stream()
                .filter(flow -> flow.getStatus() == PacketStatus.DROPPED || flow.getStatus() == PacketStatus.EXPIRED)
                .mapToInt(flow -> 1)
                .sum();
    }

    private List<PlayerReportDto> playerReports(GameStateDto state) {
        return safePlayers(state).stream()
                .sorted(Comparator.comparingInt(Player::getScore).reversed()
                        .thenComparing(player -> cleanName(player.getDisplayName())))
                .map(player -> new PlayerReportDto(
                        player.getId(),
                        cleanName(player.getDisplayName()),
                        player.getColor(),
                        player.getScore(),
                        player.getDeliveredPackets(),
                        player.getDroppedPackets()))
                .toList();
    }

    private Map<String, String> playerNamesById(GameStateDto state) {
        Map<String, String> names = new HashMap<>();
        for (Player player : safePlayers(state)) {
            names.put(player.getId(), cleanName(player.getDisplayName()));
        }
        return names;
    }

    private TimelineEventDto actionTimeline(PlayerActionAuditEntity action, Map<String, String> playerNames) {
        String actor = playerNames.getOrDefault(action.getPlayerId(), fallbackId(action.getPlayerId()));
        List<String> path = readPath(action.getPathJson());
        String result = action.getResultStatus() != null ? action.getResultStatus().name() : null;
        String summary = actor + " routed packet " + fallbackId(action.getPacketFlowId());
        if (result != null) {
            summary += " and got " + result.toLowerCase(Locale.ROOT);
        }
        summary += " (" + signed(action.getScoreDelta()) + " pts, "
                + Math.round(action.getLatencyMs()) + " ms).";
        return new TimelineEventDto(
                action.getCreatedAt(),
                action.getActionType(),
                actor,
                action.getPacketFlowId(),
                summary,
                action.getScoreDelta(),
                action.getLatencyMs(),
                result,
                path);
    }

    private TimelineEventDto eventTimeline(TrafficEventAuditEntity event, Map<String, String> playerNames) {
        Map<String, Object> payload = readPayload(event.getPayloadJson());
        String playerId = stringValue(payload.get("playerId"));
        String actor = playerId != null ? playerNames.getOrDefault(playerId, fallbackId(playerId)) : "System";
        Integer scoreDelta = integerValue(payload.get("scoreDelta"));
        Double latencyMs = doubleValue(payload.get("latencyMs"));
        List<String> path = listValue(payload.get("path"));
        String summary = eventSummary(event, payload, actor, scoreDelta, latencyMs);
        return new TimelineEventDto(
                event.getCreatedAt(),
                event.getEventType(),
                actor,
                event.getSubjectId(),
                summary,
                scoreDelta,
                latencyMs,
                statusFromEventType(event.getEventType()),
                path);
    }

    private String eventSummary(TrafficEventAuditEntity event, Map<String, Object> payload, String actor,
                                Integer scoreDelta, Double latencyMs) {
        String eventType = event.getEventType() != null ? event.getEventType() : "EVENT";
        if (eventType.startsWith("PACKET_")) {
            String result = statusFromEventType(eventType);
            String summary = actor + " packet " + fallbackId(event.getSubjectId()) + " was "
                    + result.toLowerCase(Locale.ROOT);
            if (scoreDelta != null || latencyMs != null) {
                summary += " (";
                if (scoreDelta != null) {
                    summary += signed(scoreDelta) + " pts";
                }
                if (scoreDelta != null && latencyMs != null) {
                    summary += ", ";
                }
                if (latencyMs != null) {
                    summary += Math.round(latencyMs) + " ms";
                }
                summary += ")";
            }
            return summary + ".";
        }
        if (contains(eventType, "INCIDENT")) {
            String incidentType = stringValue(payload.get("eventType"));
            String message = stringValue(payload.get("message"));
            if (message != null && !message.isBlank()) {
                return (incidentType != null ? incidentType : eventType) + ": " + message;
            }
            return (incidentType != null ? incidentType : eventType) + " affected the map.";
        }
        return eventType + " recorded for " + fallbackId(event.getSubjectId()) + ".";
    }

    private List<String> readPath(String pathJson) {
        if (pathJson == null || pathJson.isBlank()) {
            return List.of();
        }
        try {
            return objectMapper.readValue(pathJson, STRING_LIST);
        } catch (JsonProcessingException | RuntimeException ex) {
            return List.of();
        }
    }

    private Map<String, Object> readPayload(String payloadJson) {
        if (payloadJson == null || payloadJson.isBlank()) {
            return Map.of();
        }
        try {
            return objectMapper.readValue(payloadJson, JSON_MAP);
        } catch (JsonProcessingException | RuntimeException ex) {
            return Map.of();
        }
    }

    private double averageLatency(List<PlayerActionAuditEntity> actions) {
        return actions.stream()
                .mapToDouble(PlayerActionAuditEntity::getLatencyMs)
                .average()
                .orElse(0.0);
    }

    private String highlight(PlayerReportDto winner, int routeActions) {
        if (winner == null) {
            return "No player score was recorded for this match.";
        }
        if (routeActions == 0) {
            return winner.displayName() + " led the final table; no route actions were audited.";
        }
        return winner.displayName() + " won with " + winner.score() + " points after "
                + winner.deliveredPackets() + " deliveries.";
    }

    private List<Player> safePlayers(GameStateDto state) {
        return state != null && state.players() != null ? state.players() : List.of();
    }

    private List<PacketFlow> safeFlows(GameStateDto state) {
        return state != null && state.packetFlows() != null ? state.packetFlows() : List.of();
    }

    private boolean contains(String value, String needle) {
        return value != null && value.toUpperCase(Locale.ROOT).contains(needle);
    }

    private String statusFromEventType(String eventType) {
        if (eventType == null) {
            return null;
        }
        if (eventType.startsWith("PACKET_")) {
            return eventType.substring("PACKET_".length());
        }
        return null;
    }

    private String cleanName(String displayName) {
        if (displayName == null || displayName.isBlank()) {
            return "Unknown player";
        }
        return displayName.trim();
    }

    private String fallbackId(String id) {
        if (id == null || id.isBlank()) {
            return "unknown";
        }
        return id.length() <= 8 ? id : id.substring(0, 8);
    }

    private String signed(int value) {
        return value >= 0 ? "+" + value : Integer.toString(value);
    }

    private String stringValue(Object value) {
        return value != null ? String.valueOf(value) : null;
    }

    private Integer integerValue(Object value) {
        if (value instanceof Number number) {
            return number.intValue();
        }
        if (value instanceof String text) {
            try {
                return Integer.parseInt(text);
            } catch (NumberFormatException ignored) {
                return null;
            }
        }
        return null;
    }

    private Double doubleValue(Object value) {
        if (value instanceof Number number) {
            return number.doubleValue();
        }
        if (value instanceof String text) {
            try {
                return Double.parseDouble(text);
            } catch (NumberFormatException ignored) {
                return null;
            }
        }
        return null;
    }

    @SuppressWarnings("unchecked")
    private List<String> listValue(Object value) {
        if (value instanceof List<?> list) {
            return list.stream().map(String::valueOf).toList();
        }
        return List.of();
    }

    private static final class PlayerTotals {
        private final String playerName;
        private int totalScore;
        private int wins;
        private int matches;
        private int deliveredPackets;
        private int droppedPackets;
        private int bestScore = Integer.MIN_VALUE;

        private PlayerTotals(String playerName) {
            this.playerName = playerName;
        }

        private void add(Player player, boolean winner) {
            matches += 1;
            totalScore += player.getScore();
            deliveredPackets += player.getDeliveredPackets();
            droppedPackets += player.getDroppedPackets();
            bestScore = Math.max(bestScore, player.getScore());
            if (winner) {
                wins += 1;
            }
        }

        private LeaderboardEntryDto toDto() {
            double average = matches == 0 ? 0.0 : (double) totalScore / matches;
            return new LeaderboardEntryDto(
                    playerName,
                    totalScore,
                    wins,
                    matches,
                    deliveredPackets,
                    droppedPackets,
                    bestScore == Integer.MIN_VALUE ? 0 : bestScore,
                    average);
        }
    }
}
