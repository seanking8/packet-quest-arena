package com.packetquest.service.scoring;

import com.packetquest.model.Link;
import com.packetquest.model.PacketFlow;

import java.util.List;

/**
 * Strategy for calculating a session's score from its current state.
 * The default strategy is DefaultScoringStrategy; alternatives could be
 * swapped in (e.g. for testing, a "harsher congestion" variant, or per-mode
 * scoring later) without changing the call site.
 */
public interface ScoringStrategy {
    int calculate(List<PacketFlow> flows, List<Link> links);
}