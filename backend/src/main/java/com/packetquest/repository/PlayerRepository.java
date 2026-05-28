package com.packetquest.repository;

import com.packetquest.model.Player;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface PlayerRepository extends JpaRepository<Player, Long> {
    List<Player> findBySessionId(String sessionId);
}
