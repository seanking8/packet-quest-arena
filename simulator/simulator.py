"""
Traffic simulator — periodically posts traffic events to the backend.
"""
import os
import time
import random
import requests

BACKEND_URL = os.getenv("BACKEND_URL", "http://localhost:8080")
TICK_SECONDS = 5


def generate_event():
    return {
        "type": "TRAFFIC_UPDATE",
        "linkId": random.randint(1, 10),
        "load": random.randint(0, 100),
    }


def run():
    print("Simulator started")
    while True:
        event = generate_event()
        try:
            requests.post(f"{BACKEND_URL}/api/simulator/events", json=event, timeout=3)
        except requests.RequestException as e:
            print(f"Failed to send event: {e}")
        time.sleep(TICK_SECONDS)


if __name__ == "__main__":
    run()
