package com.packetquest.model;

/** Load/health state of a {@link NetworkLink}. */
public enum LinkStatus {
    HEALTHY,
    BUSY,
    CONGESTED,
    OVERLOADED,
    FAILED,
    EXPIRED
}
