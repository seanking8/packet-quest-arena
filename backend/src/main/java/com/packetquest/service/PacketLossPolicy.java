package com.packetquest.service;

/**
 * Decides whether a packet is lost given a route's combined loss risk [0..1].
 *
 * <p>Pluggable so tests can force or disable loss deterministically. The default
 * implementation is threshold-based (no randomness), so results are repeatable
 * and routes are never unfairly dropped.
 */
public interface PacketLossPolicy {

    boolean isLost(double routeLossRisk);
}
