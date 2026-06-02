package com.packetquest.service;

import com.packetquest.dto.IncidentSubmissionRequest;
import com.packetquest.model.GameDifficulty;
import com.packetquest.model.GameSession;
import com.packetquest.model.IncidentType;
import com.packetquest.model.LinkType;
import com.packetquest.model.NetworkLink;
import com.packetquest.model.VisualZone;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Random;

/**
 * Server-side incident generator so a match always has live disruptions without
 * the external Python simulator. Each round has its own signature:
 *
 * <ul>
 *   <li>Round 1 — calm: no auto-incidents.</li>
 *   <li>Round 2 — Rush Hour: congestion / traffic surges turn links orange→red.</li>
 *   <li>Round 3 — Storm City: a mix of weather, link failures (drop out) and
 *       degradations, so players must reroute.</li>
 * </ul>
 *
 * It only builds an {@link IncidentSubmissionRequest}; {@link IncidentService}
 * still owns resolution, severity scaling and applying effects.
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

    // Per-second chance an incident rolls, by round. Round 1 is calm; rounds 2
    // and 3 are deliberately frequent so disruptions are clearly visible inside
    // a 90s round. (Tunable.)
    private static final double[] ROUND_TICK_CHANCE = { 0.0, 0.0, 0.16, 0.22 };

    private final Random rng = new Random();

    /** Per-second incident chance for a 1-based round. */
    private double tickChance(int round) {
        int idx = Math.min(ROUND_TICK_CHANCE.length - 1, Math.max(0, round));
        return ROUND_TICK_CHANCE[idx];
    }

    /** True if an incident should be generated this tick for the given round. */
    public boolean shouldGenerateForRound(int round) {
        return rng.nextDouble() < tickChance(round);
    }

    /**
     * Build an incident appropriate to the round. Round 2 produces congestion;
     * round 3 produces a mix of weather, full link failures and degradations.
     * Returns null if this round has no auto-incidents (round 1).
     */
    public IncidentSubmissionRequest nextIncidentForRound(GameSession session, int round) {
        if (round == 2) {
            return congestionIncident();
        }
        if (round >= 3) {
            return stormIncident(session);
        }
        return null;
    }

    // --- Round 2: congestion ------------------------------------------------

    private IncidentSubmissionRequest congestionIncident() {
        VisualZone zone = randomZone();
        // Alternate between zone-wide congestion and a broader traffic surge.
        boolean surge = rng.nextBoolean();
        IncidentType type = surge ? IncidentType.TRAFFIC_SURGE : IncidentType.LINK_CONGESTION;
        List<LinkType> affected = surge
                ? List.of(LinkType.FIBRE, LinkType.MMWAVE, LinkType.MICROWAVE, LinkType.RADIO)
                : List.of(pick(LinkType.FIBRE, LinkType.MMWAVE, LinkType.MICROWAVE, LinkType.RADIO));
        double severity = round2(0.6 + rng.nextDouble() * 0.35); // 0.6–0.95: bites hard
        int duration = 18 + rng.nextInt(18); // 18–35s
        String msg = surge
                ? "Traffic surge near " + zone.id() + " is overloading links."
                : "Congestion building around " + zone.id() + ".";
        return new IncidentSubmissionRequest(type, "ZONE", zone.id(), severity, duration, msg,
                affected, List.of(), List.of(), zone);
    }

    // --- Round 3: storm (mix of weather + failures + degradation) -----------

    private IncidentSubmissionRequest stormIncident(GameSession session) {
        int roll = rng.nextInt(100);
        if (roll < 40) {
            return weatherIncident();          // 40% weather
        }
        if (roll < 70) {
            return linkFailureIncident(session); // 30% a link drops out
        }
        if (roll < 90) {
            return degradeIncident();          // 20% degradation (slow/lossy)
        }
        return weatherClear();                  // 10% clearing
    }

    private IncidentSubmissionRequest weatherIncident() {
        VisualZone zone = randomZone();
        IncidentType type = rng.nextBoolean()
                ? IncidentType.WEATHER_ELECTRICAL_STORM : IncidentType.WEATHER_HIGH_WINDS;
        double severity = round2(0.5 + rng.nextDouble() * 0.45);
        int duration = 20 + rng.nextInt(20);
        return new IncidentSubmissionRequest(type, "ZONE", zone.id(), severity, duration,
                messageFor(type, zone.id()), affectedLinkTypes(type), List.of(), List.of(), zone);
    }

    /** Fully fail a single real link so it drops out and must be routed around. */
    private IncidentSubmissionRequest linkFailureIncident(GameSession session) {
        NetworkLink target = randomLiveLink(session);
        if (target == null) {
            return weatherIncident(); // nothing to fail; fall back
        }
        IncidentType type = target.getLinkType() == LinkType.FIBRE
                ? IncidentType.FIBRE_CUT : IncidentType.LINK_FAILURE;
        double severity = round2(0.7 + rng.nextDouble() * 0.3);
        int duration = 15 + rng.nextInt(20); // 15–35s outage, then recovers
        String msg = (type == IncidentType.FIBRE_CUT ? "Fibre cut on " : "Link failure on ")
                + target.getId() + " — reroute around it.";
        return new IncidentSubmissionRequest(type, "LINK", target.getId(), severity, duration, msg,
                List.of(), List.of(), List.of(target.getId()), null);
    }

    private IncidentSubmissionRequest degradeIncident() {
        VisualZone zone = randomZone();
        IncidentType type = pick(IncidentType.PACKET_LOSS_SPIKE, IncidentType.LATENCY_SPIKE);
        List<LinkType> affected = List.of(pick(LinkType.RADIO, LinkType.MMWAVE, LinkType.MICROWAVE, LinkType.FIBRE));
        double severity = round2(0.4 + rng.nextDouble() * 0.4);
        int duration = 18 + rng.nextInt(16);
        String msg = (type == IncidentType.PACKET_LOSS_SPIKE ? "Packet loss spike near " : "Latency spike near ")
                + zone.id() + ".";
        return new IncidentSubmissionRequest(type, "ZONE", zone.id(), severity, duration, msg,
                affected, List.of(), List.of(), zone);
    }

    private IncidentSubmissionRequest weatherClear() {
        VisualZone zone = randomZone();
        return new IncidentSubmissionRequest(IncidentType.WEATHER_CLEAR, "ZONE", zone.id(), 0.0,
                15 + rng.nextInt(10), messageFor(IncidentType.WEATHER_CLEAR, zone.id()),
                List.of(), List.of(), List.of(), zone);
    }

    // --- Backwards-compatible weather API (used by older callers/tests) -----

    /** @deprecated prefer {@link #shouldGenerateForRound(int)}. */
    @Deprecated
    public boolean shouldGenerate(GameDifficulty difficulty) {
        double chance = difficulty == GameDifficulty.HARD ? 0.075
                : difficulty == GameDifficulty.EASY ? 0.04 : 0.055;
        return rng.nextDouble() < chance;
    }

    /** @deprecated prefer {@link #nextIncidentForRound(GameSession, int)}. */
    @Deprecated
    public IncidentSubmissionRequest nextWeather() {
        return weatherIncident();
    }

    // --- helpers ------------------------------------------------------------

    private VisualZone randomZone() {
        return ZONES.get(rng.nextInt(ZONES.size()));
    }

    /** A random currently-usable link, or null if none. */
    private NetworkLink randomLiveLink(GameSession session) {
        List<NetworkLink> usable = session.getLinks().stream()
                .filter(l -> l.getStatus() != com.packetquest.model.LinkStatus.FAILED
                        && l.getStatus() != com.packetquest.model.LinkStatus.EXPIRED)
                .toList();
        return usable.isEmpty() ? null : usable.get(rng.nextInt(usable.size()));
    }

    @SafeVarargs
    private final <T> T pick(T... options) {
        return options[rng.nextInt(options.length)];
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
