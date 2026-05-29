package com.packetquest.model;

/** Type of a {@link NetworkNode} in the simplified 5G/O-RAN topology. */
public enum NodeType {
    RADIO_TOWER,
    SMALL_CELL,
    O_RU,
    O_DU,
    O_CU,
    EDGE,
    UPF,
    CORE,
    DATA_CENTRE,
    SATELLITE
}
