package com.packetquest.model;

import java.util.UUID;

/**
 * A participant in a {@link GameSession}.
 *
 * <p>Players live inside the in-memory session aggregate; the backend is the
 * sole authority for {@link #score} and delivery counters. The frontend never
 * computes or submits them.
 */
public class Player {

    private String id = UUID.randomUUID().toString();
    private String displayName;
    private String color;
    private int score = 0;
    private int deliveredPackets = 0;
    private int droppedPackets = 0;

    public Player() {
    }

    public Player(String displayName) {
        this.displayName = displayName;
    }

    public Player(String displayName, String color) {
        this.displayName = displayName;
        this.color = color;
    }

    /** Adds a backend-computed delta to this player's score. */
    public void addScore(int delta) {
        this.score += delta;
    }

    public String getId() {
        return id;
    }

    public void setId(String id) {
        this.id = id;
    }

    public String getDisplayName() {
        return displayName;
    }

    public void setDisplayName(String displayName) {
        this.displayName = displayName;
    }

    public String getColor() {
        return color;
    }

    public void setColor(String color) {
        this.color = color;
    }

    public int getScore() {
        return score;
    }

    public void setScore(int score) {
        this.score = score;
    }

    public int getDeliveredPackets() {
        return deliveredPackets;
    }

    public void setDeliveredPackets(int deliveredPackets) {
        this.deliveredPackets = deliveredPackets;
    }

    public int getDroppedPackets() {
        return droppedPackets;
    }

    public void setDroppedPackets(int droppedPackets) {
        this.droppedPackets = droppedPackets;
    }
}
