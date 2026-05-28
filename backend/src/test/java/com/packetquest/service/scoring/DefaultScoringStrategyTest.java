package com.packetquest.service.scoring;

import com.packetquest.model.Link;
import com.packetquest.model.PacketFlow;
import org.junit.jupiter.api.Test;

import java.util.List;

import static org.junit.jupiter.api.Assertions.assertEquals;

class DefaultScoringStrategyTest {

    private final DefaultScoringStrategy strategy = new DefaultScoringStrategy();

    // --- Tiny builders so each test reads as "what kind of flow / link" ---

    private PacketFlow delivered(String trafficType, int latency) {
        PacketFlow f = new PacketFlow();
        f.setTrafficType(trafficType);
        f.setStatus("DELIVERED");
        f.setActualLatency(latency);
        return f;
    }

    private PacketFlow pending(String trafficType) {
        PacketFlow f = new PacketFlow();
        f.setTrafficType(trafficType);
        f.setStatus("PENDING");
        return f;
    }

    private Link link(int load, int capacity) {
        Link l = new Link();
        l.setLoad(load);
        l.setCapacity(capacity);
        return l;
    }

    // --- Tests ---

    @Test
    void emptyState_scoresZero() {
        assertEquals(0, strategy.calculate(List.of(), List.of()));
    }

    @Test
    void pendingFlows_contributeNothing() {
        assertEquals(0, strategy.calculate(
                List.of(pending("EMERGENCY"), pending("BACKGROUND")),
                List.of()));
    }

    @Test
    void deliveredBackgroundOnFastPath_baseMinusLatency() {
        // BACKGROUND weight=1, base=100, latency=20, SLA=500ms (no breach)
        // score = 100*1 - 20*1 = 80
        assertEquals(80, strategy.calculate(
                List.of(delivered("BACKGROUND", 20)), List.of()));
    }

    @Test
    void deliveredEmergencyOnFastPath_scaledHeavily() {
        // EMERGENCY weight=3, base=100, latency=20, SLA=50ms (no breach)
        // score = 100*3 - 20*3 = 240
        assertEquals(240, strategy.calculate(
                List.of(delivered("EMERGENCY", 20)), List.of()));
    }

    @Test
    void emergencyOverSlaBudget_takesAdditionalBreachPenalty() {
        // EMERGENCY SLA=50ms, latency=80 -> breach
        // base 100*3 - 80*3 - 100 (breach) = 300 - 240 - 100 = -40, floored to 0
        assertEquals(0, strategy.calculate(
                List.of(delivered("EMERGENCY", 80)), List.of()));
    }

    @Test
    void videoJustBelowSla_noBreachPenalty() {
        // VIDEO SLA=120ms, weight=2; latency=100 (no breach)
        // score = 100*2 - 100*2 = 0
        assertEquals(0, strategy.calculate(
                List.of(delivered("VIDEO", 100)), List.of()));
    }

    @Test
    void overloadedLink_takesCongestionPenalty() {
        // No flows; one overloaded link -> -50, floored to 0
        assertEquals(0, strategy.calculate(
                List.of(), List.of(link(120, 100))));
    }

    @Test
    void healthyLink_noCongestionPenalty() {
        // Two delivered BACKGROUND on fast paths, no overload
        // 2 * (100 - 20) = 160
        assertEquals(160, strategy.calculate(
                List.of(delivered("BACKGROUND", 20), delivered("BACKGROUND", 20)),
                List.of(link(50, 100))));
    }

    @Test
    void mixedRealisticScenario() {
        // EMERGENCY on slow path (breach): 300 - 90*3 - 100 = -70
        // BACKGROUND on slow path (still under SLA 500): 100 - 200 = -100
        // VIDEO on fast path (under SLA 120): 200 - 60*2 = 80
        // One overloaded link: -50
        // Sum: -70 + -100 + 80 - 50 = -140 -> floored to 0
        assertEquals(0, strategy.calculate(
                List.of(
                        delivered("EMERGENCY", 90),
                        delivered("BACKGROUND", 200),
                        delivered("VIDEO", 60)
                ),
                List.of(link(120, 100))));
    }

    @Test
    void scoreNeverGoesNegative() {
        // Hypothetically very bad state
        assertEquals(0, strategy.calculate(
                List.of(delivered("EMERGENCY", 1000)),  // way over SLA
                List.of(link(999, 1), link(999, 1), link(999, 1))));
    }
}