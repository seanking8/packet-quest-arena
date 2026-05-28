package com.packetquest.repository;

import com.packetquest.model.Link;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface LinkRepository extends JpaRepository<Link, Long> {
    List<Link> findBySessionId(String sessionId);
}