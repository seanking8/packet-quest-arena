package com.packetquest.repository;

import com.packetquest.model.GameSession;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.Optional;

public interface GameSessionRepository extends JpaRepository<GameSession, String> {
    Optional<GameSession> findByJoinCode(String joinCode);
    boolean existsByJoinCode(String joinCode);
}