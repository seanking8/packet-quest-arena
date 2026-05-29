package com.packetquest.config;

import com.packetquest.model.TrafficType;

/**
 * Static configuration for a traffic type: its score {@code value}, network
 * {@code packetSize} (load) and SLA {@code deadlineSeconds}.
 *
 * <p>{@code value} drives scoring (computed later by the backend) and is kept
 * here rather than on {@link com.packetquest.model.PacketFlow} so packets carry
 * only per-instance data; the value is always derivable from the traffic type.
 */
public record TrafficProfile(
        TrafficType trafficType,
        int value,
        int packetSize,
        int deadlineSeconds
) {
}
