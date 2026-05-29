package com.packetquest.model;

/** Delivery state of a {@link PacketFlow}. */
public enum PacketStatus {
    PENDING,
    DELIVERED,
    DROPPED,
    EXPIRED
}
