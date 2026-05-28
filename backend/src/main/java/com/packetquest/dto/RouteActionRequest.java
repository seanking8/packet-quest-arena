package com.packetquest.dto;

import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;

import java.util.List;

/**
 * Player action: route the given flow along the given path of node IDs.
 * The path must start at the flow's source and end at its destination,
 * and each consecutive pair (path[i], path[i+1]) must be a real link.
 */
public class RouteActionRequest {

    @NotNull
    private Long playerId;

    @NotNull
    private Long flowId;

    @NotEmpty
    private List<Long> path;

    public Long getPlayerId() { return playerId; }
    public void setPlayerId(Long playerId) { this.playerId = playerId; }

    public Long getFlowId() { return flowId; }
    public void setFlowId(Long flowId) { this.flowId = flowId; }

    public List<Long> getPath() { return path; }
    public void setPath(List<Long> path) { this.path = path; }
}