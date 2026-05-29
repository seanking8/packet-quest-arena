package com.packetquest.config;

import com.packetquest.model.TrafficType;
import org.springframework.stereotype.Component;

import java.util.Collection;
import java.util.Map;

/**
 * Backend-owned traffic-type configuration table.
 *
 * <pre>
 * Type        value  size  deadline(s)  notes
 * EMERGENCY    150     8        8        high value, strict latency
 * CONTROL      120     6       12        reliability matters
 * VIDEO         90    20       20        high bandwidth / load
 * IOT           70     4       30        tolerates delay, not loss
 * BACKGROUND    40    12       45        lowest priority
 * </pre>
 */
@Component
public class TrafficProfiles {

    private final Map<TrafficType, TrafficProfile> profiles = Map.of(
            TrafficType.EMERGENCY, new TrafficProfile(TrafficType.EMERGENCY, 150, 8, 8),
            TrafficType.CONTROL, new TrafficProfile(TrafficType.CONTROL, 120, 6, 12),
            TrafficType.VIDEO, new TrafficProfile(TrafficType.VIDEO, 90, 20, 20),
            TrafficType.IOT, new TrafficProfile(TrafficType.IOT, 70, 4, 30),
            TrafficType.BACKGROUND, new TrafficProfile(TrafficType.BACKGROUND, 40, 12, 45)
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
