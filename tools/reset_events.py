"""Reset database with correct events only."""
from __future__ import annotations

import datetime as dt
import os
import sys
from pathlib import Path

# Add src to path
sys.path.insert(0, str(Path(__file__).parent.parent / "src"))

from sqlalchemy import create_engine, text
from sqlalchemy.orm import Session

from ics_connect.repositories.sql import SQLRepos
from ics_connect.services.events import EventService, CreateEventInput


def parse_date_time(date_str: str, time_str: str) -> tuple[dt.datetime, dt.datetime]:
    """Parse date and time strings into datetime objects."""
    # Handle date ranges like "Nov 7th - Nov 9th"
    if " - " in date_str:
        start_date_str, end_date_str = date_str.split(" - ")
        # For now, just use the start date
        date_str = start_date_str.strip()

    # Parse date like "Nov 7th" or "Nov 3rd"
    month_map = {
        "Jan": 1, "Feb": 2, "Mar": 3, "Apr": 4, "May": 5, "Jun": 6,
        "Jul": 7, "Aug": 8, "Sep": 9, "Oct": 10, "Nov": 11, "Dec": 12
    }

    parts = date_str.split()
    if len(parts) < 2:
        # TBD case
        return dt.datetime(2025, 12, 1, 12, 0, 0, tzinfo=dt.UTC), dt.datetime(2025, 12, 31, 23, 59, 0, tzinfo=dt.UTC)

    month_str = parts[0]
    day_str = parts[1].replace("st", "").replace("nd", "").replace("rd", "").replace("th", "")

    month = month_map.get(month_str, 11)
    day = int(day_str)
    year = 2025

    # Parse time like "6:30 to 8:00pm" or "Saturday 8am - 10 pm"
    if "TBD" in time_str:
        start_time = dt.datetime(year, month, day, 12, 0, 0, tzinfo=dt.UTC)
        end_time = dt.datetime(year, month, day + 1 if day < 28 else day, 14, 0, 0, tzinfo=dt.UTC)
    elif "8am - 10 pm" in time_str or "8am - 10pm" in time_str:
        start_time = dt.datetime(year, month, day, 8, 0, 0, tzinfo=dt.UTC)
        # Nov 9th 10pm for multi-day event
        end_time = dt.datetime(year, month, 9, 22, 0, 0, tzinfo=dt.UTC)
    elif "6:30 to 8:00pm" in time_str:
        start_time = dt.datetime(year, month, day, 18, 30, 0, tzinfo=dt.UTC)
        end_time = dt.datetime(year, month, day, 20, 0, 0, tzinfo=dt.UTC)
    else:
        start_time = dt.datetime(year, month, day, 12, 0, 0, tzinfo=dt.UTC)
        end_time = dt.datetime(year, month, day, 14, 0, 0, tzinfo=dt.UTC)

    return start_time, end_time


def main() -> None:
    db_url = "postgresql://postgres:tOHYTyJJijKKCvATTdtkgfDSOlvVSgAD@postgres.railway.internal:5432/railway"

    events_data = [
        {
            "club": "HACKS@UCI",
            "title": "ZotHacks 2025",
            "location": "DBH 6011",
            "date": "Nov 7th - Nov 9th",
            "time": "Saturday 8am - 10 pm",
            "description": "ZotHacks is a 12-hour hackathon designed for beginners where students with minimal computer science experience will learn to build their first CS project.",
            "website": "https://zothacks.com/",
            "capacity": 150
        },
        {
            "club": "WICS",
            "title": "Mixer Event",
            "location": "DBH 6011",
            "date": "Nov 3rd",
            "time": "6:30 to 8:00pm",
            "description": "A social fun mixer for WICS to meet, network, and relax during midterm week.",
            "website": "https://wics.ics.uci.edu/",
            "capacity": 100
        },
        {
            "club": "WICS",
            "title": "Spot The Bot",
            "location": "DBH 6011",
            "date": "Nov 10th",
            "time": "6:30 to 8:00pm",
            "description": "Learn, Connect, and Play!",
            "website": "https://wics.ics.uci.edu/",
            "capacity": 100
        },
        {
            "club": "AI@UCI",
            "title": "Project Opportunity",
            "location": "TBD",
            "date": "TBD",
            "time": "TBD",
            "description": "Handwriting ML Model Self Paced Challenge",
            "website": "https://aiclub.ics.uci.edu/",
            "capacity": 50
        }
    ]

    print("Connecting to database...")
    engine = create_engine(db_url)

    with Session(engine) as session:
        # Delete all existing events and reservations
        print("Deleting all reservations...")
        session.execute(text("DELETE FROM reservations"))
        print("Deleting all events...")
        session.execute(text("DELETE FROM events"))
        session.commit()
        print("✓ Database cleared")

    # Now create events using the service
    with Session(engine) as session:
        repos = SQLRepos(session)
        event_service = EventService(repos)

        for event_data in events_data:
            starts_at, ends_at = parse_date_time(event_data["date"], event_data["time"])

            print(f"Creating: {event_data['title']}")
            event_service.create(
                CreateEventInput(
                    title=event_data["title"],
                    starts_at=starts_at,
                    ends_at=ends_at,
                    description=event_data["description"],
                    type=event_data["club"],
                    location_text=event_data["location"],
                    discord_link=None,
                    website_link=event_data["website"],
                    public=True,
                    requires_join_code=False,
                    capacity=event_data["capacity"]
                )
            )
            session.commit()
            print(f"✓ Created: {event_data['title']} with website: {event_data['website']}")

    print("\n✅ Database reset complete with 4 events!")


if __name__ == "__main__":
    main()
