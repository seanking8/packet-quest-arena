package com.packetquest.persistence;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface PlayerActionAuditJpaRepository extends JpaRepository<PlayerActionAuditEntity, Long> {
    List<PlayerActionAuditEntity> findBySessionIdOrderByCreatedAtAsc(String sessionId);
}
