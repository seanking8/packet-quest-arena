package com.packetquest.controller;

import com.packetquest.dto.GameStateDto;
import com.packetquest.dto.RouteResultResponse;
import com.packetquest.exception.InvalidRouteException;
import com.packetquest.model.GameSession;
import com.packetquest.model.PacketStatus;
import com.packetquest.service.RoutingService;
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

@WebMvcTest(ActionController.class)
class ActionControllerTest {

    @Autowired
    MockMvc mockMvc;
    @MockBean
    RoutingService routingService;

    private RouteResultResponse delivered() {
        return new RouteResultResponse("Packet delivered in 4ms.", PacketStatus.DELIVERED,
                4.0, 120, GameStateDto.from(new GameSession()));
    }

    @Test
    void submitRoute_returns200WithResult() throws Exception {
        when(routingService.submitRoute(anyString(), any())).thenReturn(delivered());

        mockMvc.perform(post("/api/sessions/s1/actions/route")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"playerId\":\"p1\",\"packetFlowId\":\"pkt\",\"path\":[\"A\",\"B\"]}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.packetStatus").value("DELIVERED"))
                .andExpect(jsonPath("$.scoreDelta").value(120))
                .andExpect(jsonPath("$.latencyMs").value(4.0));
    }

    @Test
    void submitRoute_clientSuppliedScoreIsIgnored() throws Exception {
        when(routingService.submitRoute(anyString(), any())).thenReturn(delivered());

        // Client tries to inject score/latency/result — extra fields are ignored,
        // and the response reflects only the backend-computed values.
        mockMvc.perform(post("/api/sessions/s1/actions/route")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"playerId\":\"p1\",\"packetFlowId\":\"pkt\",\"path\":[\"A\",\"B\"],"
                                + "\"score\":99999,\"latencyMs\":1,\"packetStatus\":\"DELIVERED\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.scoreDelta").value(120));
    }

    @Test
    void submitRoute_invalidRoute_returns422() throws Exception {
        when(routingService.submitRoute(anyString(), any()))
                .thenThrow(new InvalidRouteException("Path must start at the packet source node."));

        mockMvc.perform(post("/api/sessions/s1/actions/route")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"playerId\":\"p1\",\"packetFlowId\":\"pkt\",\"path\":[\"X\",\"B\"]}"))
                .andExpect(status().isUnprocessableEntity())
                .andExpect(jsonPath("$.status").value(422));
    }

    @Test
    void submitRoute_blankPlayerId_returns400() throws Exception {
        mockMvc.perform(post("/api/sessions/s1/actions/route")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"playerId\":\"\",\"packetFlowId\":\"pkt\",\"path\":[\"A\",\"B\"]}"))
                .andExpect(status().isBadRequest());
    }
}
