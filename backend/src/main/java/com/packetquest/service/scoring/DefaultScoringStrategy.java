package com.packetquest.service.scoring;

import com.packetquest.model.Link;
import com.packetquest.model.PacketFlow;
import org.springframework.stereotype.Component;

import java.util.List;
import java.util.Map;

/**
 * Default cooperative-mode scoring.
 *
 * Four factors (the spec requires at least three from: delivery rate, latency,
 * packet loss, cost, priority protection):
 *
 *  1. Delivery base
 *     Each DELIVERED flow scores 100 × priority weight.
 *     Priority traffic protection comes from the weights:
 *       EMERGENCY = 3, CONTROL = 3, VIDEO = 2, IOT = 2, BACKGROUND = 1.
 *     Different traffic types are worth different amounts to deliver.
 *
 *  2. Path-latency penalty
 *     Subtract actualLatency × priority weight for each delivered flow.
 *     Long routes are punished; long routes for high-priority traffic are
 *     punished much harder. EMERGENCY over a 90ms route hurts more than
 *     BACKGROUND over the same route.
 *
 *  3. SLA breach penalty
 *     If a delivered flow exceeds its traffic type's latency budget, take a
 *     flat -100. Maps to real telecom SLA classes from the spec's O-RAN angle:
 *       EMERGENCY  ≤ 50ms
 *       CONTROL    ≤ 80ms
 *       VIDEO      ≤ 120ms
 *       IOT        ≤ 300ms
 *       BACKGROUND ≤ 500ms
 *
 *  4. Congestion penalty
 *     Every link whose load now exceeds its capacity costs -50.
 *     Approximates packet loss without simulating per-packet drops.
 *
 * Floor the result at 0 so the UI never shows a negative score.
 */
@Component
public class DefaultScoringStrategy implements ScoringStrategy {

    private static final int DELIVERY_BASE = 100;
    private static final int SLA_BREACH_PENALTY = 100;
    private static final int CONGESTION_PENALTY = 50;

    private static final Map<String, Integer> PRIORITY_WEIGHT = Map.of(
            "EMERGENCY", 3,
            "CONTROL",   3,
            "VIDEO",     2,
            "IOT",       2,
            "BACKGROUND", 1
    );

    /** Maximum tolerable latency per traffic type, in ms. */
    private static final Map<String, Integer> SLA_LATENCY_MS = Map.of(
            "EMERGENCY",   50,
            "CONTROL",     80,
            "VIDEO",      120,
            "IOT",        300,
            "BACKGROUND", 500
    );

    @Override
    public int calculate(List<PacketFlow> flows, List<Link> links) {
        int score = 0;

        for (PacketFlow f : flows) {
            if (!"DELIVERED".equals(f.getStatus())) continue;

            int weight = PRIORITY_WEIGHT.getOrDefault(f.getTrafficType(), 1);
            int latency = f.getActualLatency() == null ? 0 : f.getActualLatency();

            // Factor 1: delivery base, scaled by priority
            score += DELIVERY_BASE * weight;

            // Factor 2: path-latency penalty, scaled by priority
            score -= latency * weight;

            // Factor 3: SLA breach penalty
            Integer sla = SLA_LATENCY_MS.get(f.getTrafficType());
            if (sla != null && latency > sla) {
                score -= SLA_BREACH_PENALTY;
            }
        }

        // Factor 4: congestion penalty
        for (Link l : links) {
            if (l.getLoad() > l.getCapacity()) {
                score -= CONGESTION_PENALTY;
            }
        }

        return Math.max(0, score);
    }
}