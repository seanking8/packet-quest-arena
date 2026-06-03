package com.packetquest.persistence;

import com.packetquest.model.SessionStatus;
import com.packetquest.model.GameDifficulty;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface GameSessionSnapshotJpaRepository extends JpaRepository<GameSessionSnapshotEntity, String> {
    List<GameSessionSnapshotEntity> findTop10ByStatusOrderByUpdatedAtDesc(SessionStatus status);

    List<GameSessionSnapshotEntity> findByStatusOrderByUpdatedAtDesc(SessionStatus status);

    List<GameSessionSnapshotEntity> findByStatusAndDifficultyOrderByUpdatedAtDesc(
            SessionStatus status, GameDifficulty difficulty);
}
