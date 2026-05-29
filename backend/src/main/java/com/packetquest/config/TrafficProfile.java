package com.packetquest.config;

import com.packetquest.model.TrafficType;

/**
 * Static configuration for a traffic type.
 *
 * <ul>
 *   <li>{@code value} — base score awarded on delivery.</li>
 *   <li>{@code packetSize} — network load added to each link on the route.</li>
 *   <li>{@code deadlineSeconds} — gameplay deadline (PacketFlow.expiresAt).</li>
 *   <li>{@code slaLatencyMs} — max end-to-end network latency before the packet
 *       is considered too slow and dropped.</li>
 *   <li>{@code dropPenalty} — score penalty (subtracted) when dropped/expired.</li>
 * </ul>
 *
 * <p>Kept off {@link com.packetquest.model.PacketFlow} so packets carry only
 * per-instance data; all of this is derivable from the traffic type.
 */
public record TrafficProfile(
        TrafficType trafficType,
        int value,
        int packetSize,
        int deadlineSeconds,
        int slaLatencyMs,
        int dropPenalty
) {
}
