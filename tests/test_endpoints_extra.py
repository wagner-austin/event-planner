from __future__ import annotations

import datetime as dt
import unittest

from ics_connect.db import Store
from ics_connect.endpoints import (
    SearchParams,
    create_event_ep,
    get_event_ep,
    health_ep,
    my_reservation_ep,
    reserve_ep,
    search_ep,
)
from ics_connect.errors import AppError
from ics_connect.types import CreateEventBody, ReserveBody, SearchResult


class TestEndpointsExtra(unittest.TestCase):
    def setUp(self) -> None:
        self.store = Store()
        now = dt.datetime.utcnow()
        self.body: CreateEventBody = {
            "title": "Alpha",
            "description": None,
            "type": None,
            "starts_at": now + dt.timedelta(hours=1),
            "ends_at": now + dt.timedelta(hours=2),
            "location_text": "LOC",
            "capacity": 1,
            "public": True,
            "requires_join_code": False,
            "tags": [],
        }
        created = create_event_ep(self.body, self.store)
        self.event_id: str = created["event"]["id"]

    def test_get_event_counts_after_reservations(self) -> None:
        # Make one confirmed and one waitlisted
        body_a: ReserveBody = {"display_name": "A", "email": None, "join_code": None}
        body_b: ReserveBody = {"display_name": "B", "email": None, "join_code": None}
        reserve_ep(self.event_id, body_a, self.store)
        reserve_ep(self.event_id, body_b, self.store)
        pub = get_event_ep(self.event_id, self.store)
        self.assertEqual(pub["confirmed_count"], 1)
        self.assertEqual(pub["waitlist_count"], 1)

    def test_health_and_search_defaults(self) -> None:
        ok = health_ep()
        expected: dict[str, bool] = {"ok": True}
        self.assertEqual(ok, expected)
        params = SearchParams(q=None, start=None, to=None, limit=10, offset=0)
        result = search_ep(params=params, store=self.store)
        self.assertGreaterEqual(result["total"], 1)
        params2 = SearchParams(q=None, start=None, to=None, limit=10, offset=999)
        result2 = search_ep(params=params2, store=self.store)
        self.assertEqual(len(result2["events"]), 0)

    def test_search_q_and_dates_and_paging(self) -> None:
        now = dt.datetime.utcnow()
        # second event not matching title
        create_event_ep({
            "title": "Beta",
            "description": None,
            "type": None,
            "starts_at": now + dt.timedelta(hours=3),
            "ends_at": now + dt.timedelta(hours=4),
            "location_text": "L2",
            "capacity": 10,
            "public": True,
            "requires_join_code": False,
            "tags": [],
        }, self.store)
        params = SearchParams(
            q="alpha", start=now, to=now + dt.timedelta(hours=5), limit=1, offset=0
        )
        result: SearchResult = search_ep(params=params, store=self.store)
        self.assertGreaterEqual(result["total"], 1)
        self.assertEqual(len(result["events"]), 1)

    def test_my_reservation_invalid_event(self) -> None:
        body_c: ReserveBody = {"display_name": "C", "email": None, "join_code": None}
        r = reserve_ep(self.event_id, body_c, self.store)
        token: str = r["token"]
        with self.assertRaises(AppError):
            _ = my_reservation_ep("nonexistent", token, self.store)

    def test_reserve_not_found_event(self) -> None:
        with self.assertRaises(AppError):
            missing_body: ReserveBody = {"display_name": "X", "email": None, "join_code": None}
            _ = reserve_ep("missing", missing_body, self.store)

    def test_get_event_not_found(self) -> None:
        with self.assertRaises(AppError):
            _ = get_event_ep("missing", self.store)
