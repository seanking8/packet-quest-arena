package com.packetquest.controller;

import com.packetquest.dto.SessionJoinResponse;
import com.packetquest.exception.SessionNotFoundException;
import com.packetquest.service.GameService;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;

import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@WebMvcTest(SessionController.class)
class SessionControllerTest {

    @Autowired MockMvc mockMvc;
    @MockBean GameService gameService;

    @Test
    void createSession_returnsSession() throws Exception {
        when(gameService.createSession(anyString()))
                .thenReturn(new SessionJoinResponse("s-1", "K7M2QP", "WAITING", 1L, "Alice"));

        mockMvc.perform(post("/api/sessions")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"playerName\":\"Alice\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.sessionId").exists())
                .andExpect(jsonPath("$.playerId").exists());
    }

    @Test
    void joinSession_validCode_returnsSession() throws Exception {
        when(gameService.joinSession(anyString(), anyString()))
                .thenReturn(new SessionJoinResponse("s-1", "K7M2QP", "WAITING", 2L, "Bob"));

        mockMvc.perform(post("/api/sessions/ASECCH/join")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"playerName\":\"Bob\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.sessionId").exists())
                .andExpect(jsonPath("$.playerId").exists());
    }

    @Test
    void joinSession_invalidCode_returns404WithSafeError() throws Exception {
        when(gameService.joinSession(eq("BADCODE"), anyString()))
                .thenThrow(new SessionNotFoundException("Session not found"));

        mockMvc.perform(post("/api/sessions/BADCODE/join")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"playerName\":\"Bob\"}"))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.error").value("Session not found"));
    }

    @Test
    void createSession_blankName_returns400() throws Exception {
        mockMvc.perform(post("/api/sessions")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"playerName\":\"\"}"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.error").exists());
    }
}