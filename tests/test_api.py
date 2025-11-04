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
from ics_connect.types import CreateEventBody, ReserveBody


def make_body(now: dt.datetime) -> CreateEventBody:
    return {
        "title": "UCI Study Session",
        "description": "Bring laptops",
        "type": "study_session",
        "starts_at": (now + dt.timedelta(hours=1)),
        "ends_at": (now + dt.timedelta(hours=2)),
        "location_text": "ICS 432",
        "capacity": 1,
        "public": True,
        "requires_join_code": False,
        "tags": ["uci", "cs"],
    }


class TestAPI(unittest.TestCase):
    def setUp(self) -> None:
        self.store = Store()

    def test_event_create_get_and_reserve_flow(self) -> None:
        now = dt.datetime.utcnow()
        body = make_body(now)
        created = create_event_ep(body, self.store)
        event = created["event"]
        event_id: str = event["id"]
        self.assertEqual(event["title"], body["title"]) 

        got = get_event_ep(event_id, self.store)
        self.assertEqual(got["id"], event_id)

        # Reserve first attendee (confirmed)
        reserve_body: ReserveBody = {
            "display_name": "Ana",
            "email": "ana@uci.edu",
            "join_code": None,
        }
        reserve = reserve_ep(event_id, reserve_body, self.store)
        token: str = reserve["token"]
        reservation = reserve["reservation"]
        self.assertEqual(reservation["status"], "confirmed")

        # Check my reservation
        mine = my_reservation_ep(event_id, token, self.store)
        self.assertEqual(mine["id"], reservation["id"]) 

        # Second attendee should be waitlisted due to capacity
        reserve2 = reserve_ep(
            event_id, {"display_name": "Ben", "email": "ben@uci.edu", "join_code": None}, self.store
        )
        self.assertEqual(reserve2["reservation"]["status"], "waitlisted")

        # Cancel first; second should be promoted automatically
        cancel = cancel_my_reservation_ep(event_id, token, self.store)
        self.assertEqual(cancel["status"], "canceled")
