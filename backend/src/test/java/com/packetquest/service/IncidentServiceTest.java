package com.packetquest.service;

import com.packetquest.dto.GameStateDto;
import com.packetquest.dto.IncidentSubmissionRequest;
import com.packetquest.exception.SessionNotFoundException;
import com.packetquest.model.GameSession;
import com.packetquest.model.IncidentType;
import com.packetquest.model.LinkStatus;
import com.packetquest.model.LinkType;
import com.packetquest.model.NetworkLink;
import com.packetquest.model.NetworkNode;
import com.packetquest.model.NodeStatus;
import com.packetquest.model.VisualZone;
import com.packetquest.repository.GameSessionRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

/** Tests for applying simulator incidents to a session's topology. */
class IncidentServiceTest {

    private GameSessionRepository repo;
    private IncidentService service;
    private GameSession session;

    @BeforeEach
    void setUp() {
        repo = new GameSessionRepository();
        service = new IncidentService(repo, (id, state) -> { /* no-op */ });
        session = new GameSession();
        new TopologyGeneratorService().populate(session);
        session.start();
        repo.save(session);
    }

    private NetworkLink link(String id) {
        return session.getLinks().stream().filter(l -> l.getId().equals(id)).findFirst().orElseThrow();
    }

    private NetworkNode node(String id) {
        return session.getNodes().stream().filter(n -> n.getId().equals(id)).findFirst().orElseThrow();
    }

    @Test
    void weatherIncident_appearsInStateAndDegradesWirelessLinks() {
        double baseLoss = link("l-runorth-oru").getPacketLossRate(); // RADIO

        GameStateDto state = service.applyIncident(session.getId(), new IncidentSubmissionRequest(
                IncidentType.WEATHER_ELECTRICAL_STORM, "ZONE", "zone-downtown", 0.5, 25,
                "Electrical storm over downtown.",
                List.of(LinkType.RADIO, LinkType.MMWAVE, LinkType.MICROWAVE),
                List.of(), List.of(),
                new VisualZone("zone-downtown", 20, -10, 18)));

        assertThat(state.incidents()).hasSize(1);
        assertThat(state.incidents().get(0).getEventType()).isEqualTo(IncidentType.WEATHER_ELECTRICAL_STORM);
        assertThat(link("l-runorth-oru").getPacketLossRate()).isGreaterThan(baseLoss);
    }

    @Test
    void fibreCut_failsTargetedFibreLink() {
        service.applyIncident(session.getId(), new IncidentSubmissionRequest(
                IncidentType.FIBRE_CUT, "LINK", "l-upf-core", 0.6, 30,
                "Fibre cut near the core.",
                List.of(), List.of(), List.of("l-upf-core"), null));

        assertThat(link("l-upf-core").getStatus()).isEqualTo(LinkStatus.FAILED);
    }

    @Test
    void weatherAffectsAllLinksOfTheGivenTypes() {
        service.applyIncident(session.getId(), new IncidentSubmissionRequest(
                IncidentType.WEATHER_HIGH_WINDS, "ZONE", "zone-north", 0.4, 20,
                "High winds.", List.of(LinkType.RADIO, LinkType.MICROWAVE),
                List.of(), List.of(), new VisualZone("zone-north", -30, 30, 20)));

        // every RADIO/MICROWAVE link should have gained latency over its base
        List<NetworkLink> wireless = session.getLinks().stream()
                .filter(l -> l.getLinkType() == LinkType.RADIO || l.getLinkType() == LinkType.MICROWAVE)
                .toList();
        assertThat(wireless).isNotEmpty();
        assertThat(wireless).allSatisfy(l ->
                assertThat(l.getCurrentLatencyMs()).isGreaterThan(l.getBaseLatencyMs()));
    }

    @Test
    void nodeFailure_failsNode() {
        service.applyIncident(session.getId(), new IncidentSubmissionRequest(
                IncidentType.NODE_FAILURE, "NODE", "ru-north", 0.8, 30,
                "Tower down.", List.of(), List.of("ru-north"), List.of(), null));

        assertThat(node("ru-north").getStatus()).isEqualTo(NodeStatus.FAILED);
    }

    @Test
    void recovery_restoresLinkAndClearsMatchingIncident() {
        service.applyIncident(session.getId(), new IncidentSubmissionRequest(
                IncidentType.FIBRE_CUT, "ZONE", "zone-core", 0.6, 30, "Fibre cut.",
                List.of(), List.of(), List.of("l-upf-core"), null));
        assertThat(link("l-upf-core").getStatus()).isEqualTo(LinkStatus.FAILED);

        service.applyIncident(session.getId(), new IncidentSubmissionRequest(
                IncidentType.RECOVERY, "ZONE", "zone-core", 0.0, 5, "Repaired.",
                List.of(), List.of(), List.of("l-upf-core"), null));

        assertThat(link("l-upf-core").getStatus()).isNotEqualTo(LinkStatus.FAILED);
        assertThat(session.getIncidents())
                .noneMatch(i -> i.getEventType() == IncidentType.FIBRE_CUT);
    }

    @Test
    void invalidSeverity_isRejected() {
        assertThatThrownBy(() -> service.applyIncident(session.getId(), new IncidentSubmissionRequest(
                IncidentType.LATENCY_SPIKE, "LINK", "l-upf-core", 2.0, 20, "bad",
                List.of(), List.of(), List.of("l-upf-core"), null)))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("severity");
    }

    @Test
    void invalidDuration_isRejected() {
        assertThatThrownBy(() -> service.applyIncident(session.getId(), new IncidentSubmissionRequest(
                IncidentType.LATENCY_SPIKE, "LINK", "l-upf-core", 0.5, 99999, "bad",
                List.of(), List.of(), List.of("l-upf-core"), null)))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("durationSeconds");
    }

    @Test
    void unknownSession_throwsNotFound() {
        assertThatThrownBy(() -> service.applyIncident("missing", new IncidentSubmissionRequest(
                IncidentType.WEATHER_CLEAR, "ZONE", "z", 0.0, 10, "ok",
                List.of(), List.of(), List.of(), null)))
                .isInstanceOf(SessionNotFoundException.class);
    }
}
