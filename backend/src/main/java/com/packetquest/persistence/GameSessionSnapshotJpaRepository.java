package com.packetquest.persistence;

import org.springframework.data.jpa.repository.JpaRepository;

public interface GameSessionSnapshotJpaRepository extends JpaRepository<GameSessionSnapshotEntity, String> {
}
