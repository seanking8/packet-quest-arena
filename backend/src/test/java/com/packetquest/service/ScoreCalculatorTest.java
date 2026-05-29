package com.packetquest.service;

import com.packetquest.config.TrafficProfile;
import com.packetquest.config.TrafficProfiles;
import com.packetquest.model.LinkStatus;
import com.packetquest.model.TrafficType;
import org.junit.jupiter.api.Test;

import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;

/** Unit tests for the backend-authoritative scoring formula. */
class ScoreCalculatorTest {

    private final ScoreCalculator calc = new ScoreCalculator();
    private final TrafficProfiles profiles = new TrafficProfiles();

    @Test
    void speedBonus_tiers() {
        int sla = 150;
        assertThat(calc.speedBonus(70, sla)).isEqualTo(30);   // <= 50% of SLA
        assertThat(calc.speedBonus(100, sla)).isEqualTo(10);  // <= 85% of SLA
        assertThat(calc.speedBonus(150, sla)).isZero();       // barely on time
    }

    @Test
    void routeCost_freeForFirstTwoHops() {
        assertThat(calc.routeCost(1)).isZero();
        assertThat(calc.routeCost(2)).isZero();
        assertThat(calc.routeCost(3)).isEqualTo(3);
        assertThat(calc.routeCost(5)).isEqualTo(9);
    }

    @Test
    void congestionPenalty_sumsPerStatus() {
        assertThat(calc.congestionPenalty(List.of(LinkStatus.HEALTHY, LinkStatus.HEALTHY))).isZero();
        assertThat(calc.congestionPenalty(
                List.of(LinkStatus.BUSY, LinkStatus.CONGESTED, LinkStatus.OVERLOADED)))
                .isEqualTo(5 + 15 + 30);
    }

    @Test
    void packetLossPenalty_scalesWithRisk() {
        assertThat(calc.packetLossPenalty(0.0)).isZero();
        assertThat(calc.packetLossPenalty(0.2)).isEqualTo(10);
    }

    @Test
    void deliveryScore_appliesFullFormula() {
        TrafficProfile video = profiles.profileFor(TrafficType.VIDEO); // value 90, sla 150
        // very fast (+30), 1 hop (cost 0), healthy (0), no loss (0)
        int score = calc.deliveryScore(video, 4, 1, List.of(LinkStatus.HEALTHY), 0.0);
        assertThat(score).isEqualTo(120);
    }

    @Test
    void deliveryScore_withCostsAndPenalties() {
        TrafficProfile video = profiles.profileFor(TrafficType.VIDEO); // value 90, sla 150
        // on time (+10), 3 hops (-3), one BUSY link (-5), risk 0.2 (-10)
        int score = calc.deliveryScore(video, 120, 3,
                List.of(LinkStatus.HEALTHY, LinkStatus.BUSY, LinkStatus.HEALTHY), 0.2);
        assertThat(score).isEqualTo(90 + 10 - 3 - 5 - 10);
    }

    @Test
    void dropScore_isNegativeTypePenalty() {
        assertThat(calc.dropScore(profiles.profileFor(TrafficType.EMERGENCY))).isEqualTo(-100);
        assertThat(calc.dropScore(profiles.profileFor(TrafficType.BACKGROUND))).isEqualTo(-20);
    }
}
