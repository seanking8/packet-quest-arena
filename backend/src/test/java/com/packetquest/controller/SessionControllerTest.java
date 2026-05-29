package com.packetquest.controller;

import com.packetquest.dto.GameStateDto;
import com.packetquest.exception.SessionNotFoundException;
import com.packetquest.model.GameSession;
import com.packetquest.model.Player;
import com.packetquest.model.SessionStatus;
import com.packetquest.service.GameService;
import com.packetquest.service.GameTickService;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;

import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@WebMvcTest(SessionController.class)
class SessionControllerTest {

    @Autowired
    MockMvc mockMvc;
    @MockBean
    GameService gameService;
    @MockBean
    GameTickService gameTickService;

    @Test
    void createSession_returns201WithSessionId() throws Exception {
        when(gameService.createSession()).thenReturn(new GameSession());

        mockMvc.perform(post("/api/sessions"))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.sessionId").exists())
                .andExpect(jsonPath("$.status").value("WAITING"));
    }

    @Test
    void joinSession_returns201WithPlayerAndColor() throws Exception {
        Player player = new Player("Alice", "blue");
        when(gameService.joinPlayer(anyString(), anyString())).thenReturn(player);
        when(gameService.getState(anyString())).thenReturn(GameStateDto.from(new GameSession()));

        mockMvc.perform(post("/api/sessions/s1/players")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"displayName\":\"Alice\"}"))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.player.displayName").value("Alice"))
                .andExpect(jsonPath("$.player.color").value("blue"))
                .andExpect(jsonPath("$.state.status").value("WAITING"));
    }

    @Test
    void joinSession_blankDisplayName_returns400() throws Exception {
        mockMvc.perform(post("/api/sessions/s1/players")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"displayName\":\"  \"}"))
                .andExpect(status().isBadRequest());
    }

    @Test
    void startSession_returns200WithState() throws Exception {
        GameSession session = new GameSession();
        session.addPlayer("Alice", "blue");
        session.addPlayer("Bob", "green");
        session.start();
        when(gameService.startSession(anyString())).thenReturn(GameStateDto.from(session));

        mockMvc.perform(post("/api/sessions/s1/start"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("ACTIVE"))
                .andExpect(jsonPath("$.players.length()").value(2));
    }

    @Test
    void getState_returns200() throws Exception {
        when(gameService.getState(anyString())).thenReturn(GameStateDto.from(new GameSession()));

        mockMvc.perform(get("/api/sessions/s1/state"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.sessionId").exists())
                .andExpect(jsonPath("$.serverTime").exists());
    }

    @Test
    void getState_unknownSession_returns404() throws Exception {
        when(gameService.getState(anyString())).thenThrow(new SessionNotFoundException("nope"));

        mockMvc.perform(get("/api/sessions/nope/state"))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.status").value(404));
    }

    @Test
    void tick_returns200WithState() throws Exception {
        GameSession session = new GameSession();
        session.setStatus(SessionStatus.COMPLETED);
        when(gameTickService.tick(anyString())).thenReturn(GameStateDto.from(session));

        mockMvc.perform(post("/api/sessions/s1/tick"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("COMPLETED"));
    }
}
