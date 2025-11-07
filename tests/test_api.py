from __future__ import annotations

import datetime as dt
import unittest

from ics_connect.db import Store
from ics_connect.endpoints import (
    cancel_my_reservation_ep,
    create_event_ep,
    get_event_ep,
    my_reservation_ep,
    reserve_ep,
)
from ics_connect.repositories.inmemory import InMemoryRepos
from ics_connect.types import CreateEventBody, ReserveBody


def make_body(now: dt.datetime) -> CreateEventBody:
    return {
        "title": "UCI Study Session",
        "description": "Bring laptops",
        "type": "study_session",
        "starts_at": (now + dt.timedelta(hours=1)),
        "ends_at": (now + dt.timedelta(hours=2)),
        "location_text": "ICS 432",
        "discord_link": None,
        "website_link": None,
        "capacity": 1,
        "public": True,
        "requires_join_code": False,
        "tags": ["uci", "cs"],
    }


class TestAPI(unittest.TestCase):
    def setUp(self) -> None:
        self.store = Store()
        self.repos = InMemoryRepos(self.store)

    def test_event_create_get_and_reserve_flow(self) -> None:
        from ics_connect.util.jwt import encode_token

        now = dt.datetime.now(dt.UTC)
        body = make_body(now)
        created = create_event_ep(body, self.repos)
        event = created["event"]
        event_id: str = event["id"]
        self.assertEqual(event["title"], body["title"])

        got = get_event_ep(event_id, self.repos)
        self.assertEqual(got["id"], event_id)

        # Create auth token for first user
        user1_id = "user-ana-123"
        auth_token1 = encode_token({"sub": user1_id, "email": "ana@uci.edu", "name": "Ana"})

        # Reserve first attendee (confirmed) with user_id
        reserve_body: ReserveBody = {
            "display_name": "Ana",
            "email": "ana@uci.edu",
            "join_code": None,
        }
        reserve = reserve_ep(event_id, reserve_body, self.repos, user_id=user1_id)
        reservation = reserve["reservation"]
        self.assertEqual(reservation["status"], "confirmed")

        # Check my reservation using auth token (not reservation token)
        mine = my_reservation_ep(event_id, auth_token1, self.repos)
        self.assertEqual(mine["id"], reservation["id"])

        # Second attendee should be waitlisted due to capacity
        user2_id = "user-ben-456"
        reserve2 = reserve_ep(
            event_id,
            {"display_name": "Ben", "email": "ben@uci.edu", "join_code": None},
            self.repos,
            user_id=user2_id,
        )
        self.assertEqual(reserve2["reservation"]["status"], "waitlisted")

        # Cancel first using auth token; second should be promoted automatically
        cancel = cancel_my_reservation_ep(event_id, auth_token1, self.repos)
        self.assertEqual(cancel["status"], "canceled")
