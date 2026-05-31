package com.packetquest.config;

import com.packetquest.model.TrafficType;
import org.springframework.stereotype.Component;

import java.util.Collection;
import java.util.Map;

/**
 * Backend-owned traffic-type configuration table.
 *
 * <pre>
 * Type        value  size  deadline(s)  slaLatency(ms)  dropPenalty
 * EMERGENCY    150     8       30            120            100
 * CONTROL      120     6       45            180             80
 * VIDEO         90    20       60            300             60
 * IOT           70     4       90            500             40
 * BACKGROUND    40    12      120            800             20
 * </pre>
 *
 * <p>Deadlines are sized so a human player has time to read a job and build a
 * route by hand; the SLA latency budgets are doubled from their original
 * values so hand-built routes have headroom before being dropped.
 */
@Component
public class TrafficProfiles {

    private final Map<TrafficType, TrafficProfile> profiles = Map.of(
            // slaLatencyMs (5th arg) doubled across all types — hand-built
            // routes were dropping too fast against the original budgets.
            TrafficType.EMERGENCY, new TrafficProfile(TrafficType.EMERGENCY, 150, 8, 30, 120, 100),
            TrafficType.CONTROL, new TrafficProfile(TrafficType.CONTROL, 120, 6, 45, 180, 80),
            TrafficType.VIDEO, new TrafficProfile(TrafficType.VIDEO, 90, 20, 60, 300, 60),
            TrafficType.IOT, new TrafficProfile(TrafficType.IOT, 70, 4, 90, 500, 40),
            TrafficType.BACKGROUND, new TrafficProfile(TrafficType.BACKGROUND, 40, 12, 120, 800, 20)
    );

    /** Returns the profile for a traffic type. */
    public TrafficProfile profileFor(TrafficType type) {
        TrafficProfile profile = profiles.get(type);
        if (profile == null) {
            throw new IllegalArgumentException("No traffic profile for type: " + type);
        }
        return profile;
    }

    public Collection<TrafficProfile> all() {
        return profiles.values();
    }
}
