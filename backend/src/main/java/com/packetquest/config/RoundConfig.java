package com.packetquest.config;

/**
 * Per-round tuning for the 3-round "rising stakes" match. The host-chosen
 * difficulty sets the baseline; each round multiplies the pressure on top and
 * toggles which mechanic dominates (routing -> congestion -> storm).
 *
 * <ul>
 *   <li>{@code intensity} — overall multiplier applied to incident severity and
 *       (inversely) to link capacity / deadlines on top of the difficulty.</li>
 *   <li>{@code weatherEnabled} — whether auto-weather rolls this round.</li>
 *   <li>{@code capacityFactor} — links' effective capacity multiplier (lower =
 *       congests faster). Drives the orange->red pressure of the congestion
 *       round.</li>
 * </ul>
 */
public enum RoundConfig {
    ROUND_1("First Packets", "Learn the ropes — calm network, generous time.",
            1.0, false, 1.0),
    ROUND_2("Rush Hour", "Traffic surges — links congest fast, balance the load.",
            1.3, false, 0.7),
    ROUND_3("Storm City", "Storms and outages hit — reroute around the chaos.",
            1.6, true, 0.85);

    private final String title;
    private final String tagline;
    private final double intensity;
    private final boolean weatherEnabled;
    private final double capacityFactor;

    RoundConfig(String title, String tagline, double intensity,
                boolean weatherEnabled, double capacityFactor) {
        this.title = title;
        this.tagline = tagline;
        this.intensity = intensity;
        this.weatherEnabled = weatherEnabled;
        this.capacityFactor = capacityFactor;
    }

    /** Config for a 1-based round number, clamped to the valid range. */
    public static RoundConfig forRound(int round) {
        RoundConfig[] all = values();
        int idx = Math.min(all.length, Math.max(1, round)) - 1;
        return all[idx];
    }

    public String title() { return title; }
    public String tagline() { return tagline; }
    public double intensity() { return intensity; }
    public boolean weatherEnabled() { return weatherEnabled; }
    public double capacityFactor() { return capacityFactor; }
}
