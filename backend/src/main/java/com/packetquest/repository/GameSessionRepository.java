package com.packetquest.repository;

import com.packetquest.model.GameSession;
import org.springframework.data.jpa.repository.JpaRepository;

public interface GameSessionRepository extends JpaRepository<GameSession, String> {}
