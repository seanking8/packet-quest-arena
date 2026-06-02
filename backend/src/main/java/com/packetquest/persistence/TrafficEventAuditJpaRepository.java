package com.packetquest.persistence;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface TrafficEventAuditJpaRepository extends JpaRepository<TrafficEventAuditEntity, Long> {
    List<TrafficEventAuditEntity> findBySessionIdOrderByCreatedAtAsc(String sessionId);
}
