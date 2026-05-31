package com.packetquest.controller;

import com.packetquest.dto.GameStateDto;
import com.packetquest.model.GameSession;
import com.packetquest.service.IncidentService;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@WebMvcTest(IncidentController.class)
class IncidentControllerTest {

    @Autowired
    MockMvc mockMvc;
    @MockBean
    IncidentService incidentService;

    @Test
    void applyIncident_validWeather_returns200() throws Exception {
        when(incidentService.applyIncident(anyString(), any()))
                .thenReturn(GameStateDto.from(new GameSession()));

        mockMvc.perform(post("/api/sessions/s1/incidents")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "eventType": "WEATHER_ELECTRICAL_STORM",
                                  "targetType": "ZONE",
                                  "targetId": "zone-downtown",
                                  "severity": 0.4,
                                  "durationSeconds": 25,
                                  "message": "Storm.",
                                  "affectedLinkTypes": ["RADIO","MMWAVE"],
                                  "affectedNodeIds": [],
                                  "affectedLinkIds": [],
                                  "visualZone": {"id":"zone-downtown","x":20,"z":-10,"radius":18}
                                }"""))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.sessionId").exists());
    }

    @Test
    void applyIncident_missingEventType_returns400() throws Exception {
        mockMvc.perform(post("/api/sessions/s1/incidents")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"targetType\":\"ZONE\",\"severity\":0.4,\"durationSeconds\":25}"))
                .andExpect(status().isBadRequest());
    }

    @Test
    void applyIncident_severityOutOfRange_returns400() throws Exception {
        mockMvc.perform(post("/api/sessions/s1/incidents")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"eventType\":\"WEATHER_HIGH_WINDS\",\"severity\":5.0,\"durationSeconds\":25}"))
                .andExpect(status().isBadRequest());
    }

    @Test
    void applyIncident_durationTooLong_returns400() throws Exception {
        mockMvc.perform(post("/api/sessions/s1/incidents")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"eventType\":\"WEATHER_HIGH_WINDS\",\"severity\":0.4,\"durationSeconds\":99999}"))
                .andExpect(status().isBadRequest());
    }

    @Test
    void applyIncident_unknownEventType_returns400Safely() throws Exception {
        // Unparseable enum -> handled as a malformed body, not a 500/stack trace.
        mockMvc.perform(post("/api/sessions/s1/incidents")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"eventType\":\"NOT_A_REAL_EVENT\",\"severity\":0.4,\"durationSeconds\":25}"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.trace").doesNotExist());
    }
}
