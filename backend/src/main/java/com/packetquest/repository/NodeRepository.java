package com.packetquest.repository;

import com.packetquest.model.Node;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface NodeRepository extends JpaRepository<Node, Long> {
    List<Node> findBySessionId(String sessionId);
}