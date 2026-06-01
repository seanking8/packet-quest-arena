package com.packetquest.service;

import com.packetquest.dto.IncidentSubmissionRequest;
import com.packetquest.model.GameDifficulty;
import com.packetquest.model.IncidentType;
import com.packetquest.model.LinkType;
import com.packetquest.model.VisualZone;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Random;

/**
 * Server-side weather generator so a match ALWAYS has live weather without
 * needing the external Python simulator running. Mirrors the simulator's
 * weather model (the same zones, weather types and affected link types) and
 * scales how often weather rolls by match difficulty.
 *
 * <p>It only builds an {@link IncidentSubmissionRequest}; {@link IncidentService}
 * still owns zone→link resolution, severity scaling and applying effects, so
 * weather behaves identically whether it comes from here or the simulator.
 */
@Service
public class WeatherGenerationService {

    /** Circular zones over city districts — kept in sync with simulator/weather.py. */
    static final List<VisualZone> ZONES = List.of(
            new VisualZone("zone-downtown", -10, 25, 45),
            new VisualZone("zone-north", -55, 72, 38),
            new VisualZone("zone-harbor", 24, -70, 34),
            new VisualZone("zone-west", -112, 0, 38),
            new VisualZone("zone-airport", 88, 76, 34),
            new VisualZone("zone-core", 112, 12, 40),
            new VisualZone("zone-south", -42, -72, 42));

    private static final List<IncidentType> WEATHER_TYPES = List.of(
            IncidentType.WEATHER_ELECTRICAL_STORM,
            IncidentType.WEATHER_HIGH_WINDS,
            IncidentType.WEATHER_CLEAR);

    private final Random rng = new Random();

    /**
     * Roughly how likely a weather event is to roll on a given tick, by
     * difficulty. EASY is calmer, HARD is stormier — matching the simulator's
     * per-difficulty weather probability, spread across ~per-second ticks so
     * weather arrives every ~15-25s on average.
     */
    private double tickChance(GameDifficulty difficulty) {
        return switch (difficulty) {
            case EASY -> 0.04;
            case HARD -> 0.075;
            default -> 0.055;
        };
    }

    /** True if weather should be generated this tick for the given difficulty. */
    public boolean shouldGenerate(GameDifficulty difficulty) {
        return rng.nextDouble() < tickChance(difficulty == null ? GameDifficulty.MEDIUM : difficulty);
    }

    /** Build a single weather incident request (zone + type + affected links). */
    public IncidentSubmissionRequest nextWeather() {
        VisualZone zone = ZONES.get(rng.nextInt(ZONES.size()));
        IncidentType type = WEATHER_TYPES.get(rng.nextInt(WEATHER_TYPES.size()));
        boolean clear = type == IncidentType.WEATHER_CLEAR;

        List<LinkType> affected = affectedLinkTypes(type);
        double severity = clear ? 0.0 : round2(0.35 + rng.nextDouble() * 0.5); // 0.35-0.85
        int duration = 20 + rng.nextInt(26); // 20-45s, within IncidentService bounds
        String message = messageFor(type, zone.id());

        return new IncidentSubmissionRequest(
                type,
                "ZONE",
                zone.id(),
                severity,
                duration,
                message,
                affected,
                List.of(),
                List.of(),
                zone);
    }

    private List<LinkType> affectedLinkTypes(IncidentType type) {
        return switch (type) {
            case WEATHER_ELECTRICAL_STORM ->
                    List.of(LinkType.RADIO, LinkType.MMWAVE, LinkType.MICROWAVE, LinkType.SATELLITE);
            case WEATHER_HIGH_WINDS -> List.of(LinkType.RADIO, LinkType.MICROWAVE);
            default -> List.of();
        };
    }

    private String messageFor(IncidentType type, String zoneId) {
        return switch (type) {
            case WEATHER_ELECTRICAL_STORM ->
                    "Electrical storm over " + zoneId + " is increasing packet loss on wireless links.";
            case WEATHER_HIGH_WINDS ->
                    "High winds near " + zoneId + " are destabilising radio and microwave links.";
            default -> "Skies are clearing over " + zoneId + "; wireless conditions are improving.";
        };
    }

    private static double round2(double v) {
        return Math.round(v * 100.0) / 100.0;
    }
}