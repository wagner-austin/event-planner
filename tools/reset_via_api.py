"""Reset events via API."""
import requests
import json
from datetime import datetime, timezone

BOT_KEY = "4b7a9d1c3e5f8a0c2d4f6a8b1c3d5e7f9a1b3c5d7e9f0a2c4b6d8f0a1c3e5b7"
API_BASE = "https://event-planner-production-d03d.up.railway.app/api/v1"

events_data = [
    {
        "title": "ZotHacks 2025",
        "description": "ZotHacks is a 12-hour hackathon designed for beginners where students with minimal computer science experience will learn to build their first CS project.",
        "type": "HACKS@UCI",
        "starts_at": "2025-11-07T08:00:00Z",
        "ends_at": "2025-11-09T22:00:00Z",
        "location_text": "DBH 6011",
        "discord_link": None,
        "website_link": "https://zothacks.com/",
        "capacity": 150,
        "public": True,
        "requires_join_code": False,
        "tags": ["HACKS@UCI", "hackathon"]
    },
    {
        "title": "Mixer Event",
        "description": "A social fun mixer for WICS to meet, network, and relax during midterm week.",
        "type": "WICS",
        "starts_at": "2025-11-03T18:30:00Z",
        "ends_at": "2025-11-03T20:00:00Z",
        "location_text": "DBH 6011",
        "discord_link": None,
        "website_link": "https://wics.ics.uci.edu/",
        "capacity": 100,
        "public": True,
        "requires_join_code": False,
        "tags": ["WICS", "social"]
    },
    {
        "title": "Spot The Bot",
        "description": "Learn, Connect, and Play!",
        "type": "WICS",
        "starts_at": "2025-11-10T18:30:00Z",
        "ends_at": "2025-11-10T20:00:00Z",
        "location_text": "DBH 6011",
        "discord_link": None,
        "website_link": "https://wics.ics.uci.edu/",
        "capacity": 100,
        "public": True,
        "requires_join_code": False,
        "tags": ["WICS", "workshop"]
    },
    {
        "title": "Project Opportunity",
        "description": "Handwriting ML Model Self Paced Challenge",
        "type": "AI@UCI",
        "starts_at": "2025-12-01T00:00:00Z",
        "ends_at": "2025-12-31T23:59:00Z",
        "location_text": "TBD",
        "discord_link": None,
        "website_link": "https://aiclub.ics.uci.edu/",
        "capacity": 50,
        "public": True,
        "requires_join_code": False,
        "tags": ["AI@UCI", "project"]
    }
]

def main():
    print(f"Getting all events from {API_BASE}")

    # Get all events
    resp = requests.get(f"{API_BASE}/search?limit=100")
    if resp.status_code != 200:
        print(f"Failed to get events: {resp.status_code}")
        return

    existing = resp.json()
    print(f"Found {existing['total']} existing events")

    print("\nWARNING: Manual database cleanup needed!")
    print("The API doesn't have a delete endpoint.")
    print("You need to either:")
    print("1. Connect to Railway database directly (from Railway dashboard)")
    print("2. Add a delete endpoint to the API")
    print("\nFor now, creating the 4 new events with website links...\n")

    # Create new events
    headers = {"X-Bot-Key": BOT_KEY}

    for event in events_data:
        print(f"Creating: {event['title']}")
        resp = requests.post(
            f"{API_BASE}/bot/events",
            headers=headers,
            json=event
        )
        if resp.status_code == 200:
            print(f"SUCCESS: Created {event['title']} with website: {event['website_link']}")
        else:
            print(f"FAILED: {resp.status_code} - {resp.text}")

    print("\nNew events created successfully!")
    print("\nYou still need to manually delete the old duplicate events from the database.")

if __name__ == "__main__":
    main()
