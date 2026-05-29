"""
Packet Quest Arena — network chaos engine (CLI).

Generates weather/incident events and either prints them as JSON or posts them
to the backend at POST /api/sessions/{SESSION_ID}/incidents.

Env vars:
  BACKEND_URL     backend base URL (default http://localhost:8080)
  SESSION_ID      if set, POST incidents to this session; otherwise print only
  SIMULATOR_SEED  optional int seed for repeatable runs
  SIMULATOR_COUNT number of incidents to emit (0 = run forever, default 0)
"""
import json
import os
import time

try:  # package (tests) vs flat (Docker image)
    from simulator.incidents import IncidentGenerator
except ImportError:  # pragma: no cover
    from incidents import IncidentGenerator

BACKEND_URL = os.getenv("BACKEND_URL", "http://localhost:8080")
SESSION_ID = os.getenv("SESSION_ID")
SEED = os.getenv("SIMULATOR_SEED")
COUNT = int(os.getenv("SIMULATOR_COUNT", "0"))


def _post(incident):
    import requests  # imported lazily so tests don't require the network stack
    url = f"{BACKEND_URL}/api/sessions/{SESSION_ID}/incidents"
    try:
        requests.post(url, json=incident, timeout=3)
    except requests.RequestException as exc:  # pragma: no cover
        print(f"Failed to post incident: {exc}")


def run(count=COUNT, seed=SEED, sleep=time.sleep):
    generator = IncidentGenerator(seed=int(seed) if seed is not None else None)
    print("Chaos engine started"
          + (f" (posting to session {SESSION_ID})" if SESSION_ID else " (print-only)"))
    emitted = 0
    while count == 0 or emitted < count:
        incident = generator.next_incident()
        if SESSION_ID:
            _post(incident)
        else:
            print(json.dumps(incident))
        emitted += 1
        if count == 0 or emitted < count:
            sleep(generator.next_interval_seconds())


if __name__ == "__main__":  # pragma: no cover
    run()
