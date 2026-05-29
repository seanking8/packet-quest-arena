package com.packetquest.service;

import org.springframework.stereotype.Component;

/**
 * Deterministic {@link PacketLossPolicy}: a packet is lost when the route's
 * combined loss risk reaches {@link #threshold}. Healthy routes have tiny risk
 * and always deliver; risk climbs as links become congested/overloaded, so an
 * overloaded route can deterministically drop. No randomness involved.
 */
@Component
public class ThresholdPacketLossPolicy implements PacketLossPolicy {

    /** Risk at or above this value drops the packet. */
    public static final double DEFAULT_THRESHOLD = 0.5;

    private final double threshold;

    public ThresholdPacketLossPolicy() {
        this(DEFAULT_THRESHOLD);
    }

    public ThresholdPacketLossPolicy(double threshold) {
        this.threshold = threshold;
    }

    @Override
    public boolean isLost(double routeLossRisk) {
        return routeLossRisk >= threshold;
    }
}
