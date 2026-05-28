package com.packetquest.controller;

import com.packetquest.model.GameSession;
import com.packetquest.service.GameService;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;

import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@WebMvcTest(SessionController.class)
class SessionControllerTest {

    @Autowired MockMvc mockMvc;
    @MockBean GameService gameService;

    @Test
    void createSession_returnsSession() throws Exception {
        GameSession session = new GameSession();
        when(gameService.createSession(anyString())).thenReturn(session);

        mockMvc.perform(post("/api/sessions")
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"playerName\":\"Alice\"}"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.id").exists());
    }
}
