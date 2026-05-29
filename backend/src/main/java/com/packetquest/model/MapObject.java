package com.packetquest.model;

import java.util.UUID;

/**
 * Lightweight non-network object on the city map: decorative buildings, tall
 * obstruction buildings, construction zones, etc.
 *
 * <p>Purely for the 3D scene (placement + size). It carries no gameplay logic;
 * incidents/weather effects are modelled separately by {@link IncidentEvent}.
 * Coordinates follow the topology convention: y is height.
 */
public class MapObject {

    private String id = UUID.randomUUID().toString();
    private MapObjectType type;
    private String label;
    private double x;
    private double y;
    private double z;
    private double sizeX;
    private double sizeY;
    private double sizeZ;

    public MapObject() {
    }

    public MapObject(String id, MapObjectType type, String label,
                     double x, double y, double z,
                     double sizeX, double sizeY, double sizeZ) {
        this.id = id;
        this.type = type;
        this.label = label;
        this.x = x;
        this.y = y;
        this.z = z;
        this.sizeX = sizeX;
        this.sizeY = sizeY;
        this.sizeZ = sizeZ;
    }

    public String getId() {
        return id;
    }

    public void setId(String id) {
        this.id = id;
    }

    public MapObjectType getType() {
        return type;
    }

    public void setType(MapObjectType type) {
        this.type = type;
    }

    public String getLabel() {
        return label;
    }

    public void setLabel(String label) {
        this.label = label;
    }

    public double getX() {
        return x;
    }

    public void setX(double x) {
        this.x = x;
    }

    public double getY() {
        return y;
    }

    public void setY(double y) {
        this.y = y;
    }

    public double getZ() {
        return z;
    }

    public void setZ(double z) {
        this.z = z;
    }

    public double getSizeX() {
        return sizeX;
    }

    public void setSizeX(double sizeX) {
        this.sizeX = sizeX;
    }

    public double getSizeY() {
        return sizeY;
    }

    public void setSizeY(double sizeY) {
        this.sizeY = sizeY;
    }

    public double getSizeZ() {
        return sizeZ;
    }

    public void setSizeZ(double sizeZ) {
        this.sizeZ = sizeZ;
    }
}
