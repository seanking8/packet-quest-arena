# Packet Quest Arena — Network Chaos Engine (Python)

The Python component is the game's **chaos engine**: it generates weather and
network incidents that the authoritative Spring Boot backend validates and
applies to a session.

## Why Python / which option

We use **Option A: a simple CLI** (`simulator.py`) backed by importable modules
(`incidents.py`, `weather.py`). It is the simplest option for a student MVP,
needs no extra web framework, is easy to unit-test deterministically, and the
existing `docker-compose` already runs it as a service (`build: ./simulator`).

The backend exposes `POST /api/sessions/{sessionId}/incidents`; the CLI posts
incidents there when `SESSION_ID` is set, otherwise it prints them as JSON.

## Modules

- `weather.py` — weather types, affected link types, map zones.
- `incidents.py` — `IncidentGenerator` (seeded, repeatable) producing incident dicts.
- `simulator.py` — CLI loop: generate → print or POST, sleeping 10–20s between events.
- `topology.py` — standalone helper (unchanged).

## Incident JSON shape

```json
{
  "eventType": "WEATHER_ELECTRICAL_STORM",
  "targetType": "ZONE",
  "targetId": "zone-downtown",
  "severity": 0.4,
  "durationSeconds": 25,
  "message": "Electrical storm over zone-downtown is increasing packet loss on wireless links.",
  "affectedLinkTypes": ["RADIO", "MMWAVE", "MICROWAVE", "SATELLITE"],
  "affectedNodeIds": [],
  "affectedLinkIds": [],
  "visualZone": { "id": "zone-downtown", "x": 20, "z": -10, "radius": 18 }
}
```

## Behaviour

- One incident every 10–20s; each lasts 15–45s; severity 0.2–0.8 (0.0 for
  WEATHER_CLEAR / RECOVERY).
- Weather (`WEATHER_ELECTRICAL_STORM`, `WEATHER_HIGH_WINDS`, `WEATHER_CLEAR`)
  mostly affects RADIO / MMWAVE / MICROWAVE / SATELLITE.
- Fibre cuts / construction affect FIBRE links; building obstruction affects
  line-of-sight MMWAVE / RADIO.
- `RECOVERY` clears previous incidents on a zone. The network is not constantly
  broken.

## Run

```bash
# print incidents (no backend needed)
cd simulator && python simulator.py            # prints forever
SIMULATOR_COUNT=5 SIMULATOR_SEED=42 python simulator.py   # 5 deterministic incidents

# post incidents to a live session
SESSION_ID=<id> BACKEND_URL=http://localhost:8080 python simulator.py
```

## Tests

```bash
# from the repo root
python -m pytest simulator/tests -q
```
