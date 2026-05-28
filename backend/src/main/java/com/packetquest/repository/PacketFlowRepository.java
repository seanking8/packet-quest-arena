package com.packetquest.repository;

import com.packetquest.model.PacketFlow;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface PacketFlowRepository extends JpaRepository<PacketFlow, Long> {
    List<PacketFlow> findBySessionId(String sessionId);
}