package com.packetquest.model;

/**
 * Match difficulty controls timing pressure and incident harshness.
 *
 * <p>Medium preserves the current game feel. Easy is tuned for first-time
 * players and demos; hard is for competitive play once teams understand routes.
 */
public enum GameDifficulty {
    EASY(420, 2.3, 0.55, 3, 2),
    MEDIUM(300, 1.0, 1.0, 4, 3),
    HARD(240, 0.75, 1.25, 5, 4);

    private final int matchDurationSeconds;
    private final double packetDeadlineMultiplier;
    private final double incidentSeverityMultiplier;
    private final int initialJobsPerPlayer;
    private final int minPendingJobsPerPlayer;

    GameDifficulty(int matchDurationSeconds,
                   double packetDeadlineMultiplier,
                   double incidentSeverityMultiplier,
                   int initialJobsPerPlayer,
                   int minPendingJobsPerPlayer) {
        this.matchDurationSeconds = matchDurationSeconds;
        this.packetDeadlineMultiplier = packetDeadlineMultiplier;
        this.incidentSeverityMultiplier = incidentSeverityMultiplier;
        this.initialJobsPerPlayer = initialJobsPerPlayer;
        this.minPendingJobsPerPlayer = minPendingJobsPerPlayer;
    }

    public int matchDurationSeconds() {
        return matchDurationSeconds;
    }

    public int scaleDeadlineSeconds(int baseDeadlineSeconds) {
        return Math.max(5, (int) Math.round(baseDeadlineSeconds * packetDeadlineMultiplier));
    }

    public double scaleIncidentSeverity(double severity) {
        return Math.max(0.0, Math.min(1.0, severity * incidentSeverityMultiplier));
    }

    public int initialJobsPerPlayer() {
        return initialJobsPerPlayer;
    }

    public int minPendingJobsPerPlayer() {
        return minPendingJobsPerPlayer;
    }
}
