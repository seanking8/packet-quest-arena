package com.packetquest.service;

import com.packetquest.config.TrafficProfile;
import com.packetquest.model.LinkStatus;
import org.springframework.stereotype.Component;

import java.util.List;

/**
 * Pure scoring logic (backend-authoritative). No state, easily unit-tested.
 *
 * <pre>
 * delivered = packetValue + speedBonus - routeCost - congestionPenalty - packetLossPenalty
 * dropped   = -dropPenalty
 * </pre>
 */
@Component
public class ScoreCalculator {

    // Speed bonus tiers, as a fraction of the SLA latency budget.
    static final double VERY_FAST_RATIO = 0.50;
    static final double ON_TIME_RATIO = 0.85;
    static final int VERY_FAST_BONUS = 30;
    static final int ON_TIME_BONUS = 10;

    // Route cost: free for the first two hops, then per-hop.
    static final int FREE_HOPS = 2;
    static final int COST_PER_EXTRA_HOP = 3;

    // Congestion penalties per link status used on the route.
    static final int BUSY_PENALTY = 5;
    static final int CONGESTED_PENALTY = 15;
    static final int OVERLOADED_PENALTY = 30;

    // Converts route loss risk [0..1] into a score penalty.
    static final int LOSS_PENALTY_FACTOR = 50;

    /** Score awarded for a delivered packet. */
    public int deliveryScore(TrafficProfile profile, double latencyMs, int hops,
                             List<LinkStatus> linkStatuses, double routeLossRisk) {
        return profile.value()
                + speedBonus(latencyMs, profile.slaLatencyMs())
                - routeCost(hops)
                - congestionPenalty(linkStatuses)
                - packetLossPenalty(routeLossRisk);
    }

    /** Score (negative) applied for a dropped or expired packet. */
    public int dropScore(TrafficProfile profile) {
        return -profile.dropPenalty();
    }

    public int speedBonus(double latencyMs, int slaLatencyMs) {
        if (latencyMs <= slaLatencyMs * VERY_FAST_RATIO) {
            return VERY_FAST_BONUS;
        }
        if (latencyMs <= slaLatencyMs * ON_TIME_RATIO) {
            return ON_TIME_BONUS;
        }
        return 0; // barely on time
    }

    public int routeCost(int hops) {
        return Math.max(0, hops - FREE_HOPS) * COST_PER_EXTRA_HOP;
    }

    public int congestionPenalty(List<LinkStatus> linkStatuses) {
        int penalty = 0;
        for (LinkStatus status : linkStatuses) {
            switch (status) {
                case BUSY -> penalty += BUSY_PENALTY;
                case CONGESTED -> penalty += CONGESTED_PENALTY;
                case OVERLOADED -> penalty += OVERLOADED_PENALTY;
                default -> { /* HEALTHY/FAILED/EXPIRED contribute nothing */ }
            }
        }
        return penalty;
    }

    public int packetLossPenalty(double routeLossRisk) {
        return (int) Math.round(routeLossRisk * LOSS_PENALTY_FACTOR);
    }
}
