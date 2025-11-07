from __future__ import annotations

import datetime as dt
import unittest

from ics_connect.db import Store
from ics_connect.endpoints import (
    SearchParams,
    cancel_my_reservation_ep,
    create_event_ep,
    get_event_ep,
    health_ep,
    my_reservation_ep,
    reserve_ep,
    search_ep,
)
from ics_connect.errors import AppError
from ics_connect.repositories.inmemory import InMemoryRepos
from ics_connect.types import CreateEventBody, ReserveBody, SearchResult


class TestEndpointsExtra(unittest.TestCase):
    def setUp(self) -> None:
        self.store = Store()
        self.repos = InMemoryRepos(self.store)
        now = dt.datetime.now(dt.UTC)
        self.body: CreateEventBody = {
            "title": "Alpha",
            "description": None,
            "type": None,
            "starts_at": now + dt.timedelta(hours=1),
            "ends_at": now + dt.timedelta(hours=2),
            "location_text": "LOC",
            "discord_link": None,
            "website_link": None,
            "capacity": 1,
            "public": True,
            "requires_join_code": False,
            "tags": [],
        }
        created = create_event_ep(self.body, self.repos)
        self.event_id: str = created["event"]["id"]

    def test_get_event_counts_after_reservations(self) -> None:
        # Make one confirmed and one waitlisted
        body_a: ReserveBody = {"display_name": "A", "email": None, "join_code": None}
        body_b: ReserveBody = {"display_name": "B", "email": None, "join_code": None}
        reserve_ep(self.event_id, body_a, self.repos)
        reserve_ep(self.event_id, body_b, self.repos)
        pub = get_event_ep(self.event_id, self.repos)
        self.assertEqual(pub["confirmed_count"], 1)
        self.assertEqual(pub["waitlist_count"], 1)

    def test_health_and_search_defaults(self) -> None:
        ok = health_ep()
        expected: dict[str, bool] = {"ok": True}
        self.assertEqual(ok, expected)
        params = SearchParams(q=None, start=None, to=None, limit=10, offset=0)
        result = search_ep(params=params, repos=self.repos)
        self.assertGreaterEqual(result["total"], 1)
        params2 = SearchParams(q=None, start=None, to=None, limit=10, offset=999)
        result2 = search_ep(params=params2, repos=self.repos)
        self.assertEqual(len(result2["events"]), 0)

    def test_search_q_and_dates_and_paging(self) -> None:
        now = dt.datetime.now(dt.UTC)
        # second event not matching title
        create_event_ep({
            "title": "Beta",
            "description": None,
            "type": None,
            "starts_at": now + dt.timedelta(hours=3),
            "ends_at": now + dt.timedelta(hours=4),
            "location_text": "L2",
            "discord_link": None,
            "website_link": None,
            "capacity": 10,
            "public": True,
            "requires_join_code": False,
            "tags": [],
        }, self.repos)
        params = SearchParams(
            q="alpha", start=now, to=now + dt.timedelta(hours=5), limit=1, offset=0
        )
        result: SearchResult = search_ep(params=params, repos=self.repos)
        self.assertGreaterEqual(result["total"], 1)
        self.assertEqual(len(result["events"]), 1)

    def test_my_reservation_invalid_event(self) -> None:
        body_c: ReserveBody = {"display_name": "C", "email": None, "join_code": None}
        r = reserve_ep(self.event_id, body_c, self.repos)
        token: str = r["token"]
        with self.assertRaises(AppError):
            _ = my_reservation_ep("nonexistent", token, self.repos)

    def test_reserve_not_found_event(self) -> None:
        with self.assertRaises(AppError):
            missing_body: ReserveBody = {"display_name": "X", "email": None, "join_code": None}
            _ = reserve_ep("missing", missing_body, self.repos)

    def test_get_event_not_found(self) -> None:
        with self.assertRaises(AppError):
            _ = get_event_ep("missing", self.repos)

    def test_my_reservation_invalid_token_no_user_id(self) -> None:
        """Test my_reservation_ep with token containing invalid user_id (line 127)."""
        from ics_connect.util.jwt import encode_token

        # Token with non-string sub
        bad_token1 = encode_token({"sub": 123, "email": "test@uci.edu", "name": "Test"})
        with self.assertRaises(AppError) as ctx1:
            my_reservation_ep(self.event_id, bad_token1, self.repos)
        self.assertEqual(ctx1.exception.code, "UNAUTHORIZED")

        # Token with empty string sub
        bad_token2 = encode_token({"sub": "", "email": "test@uci.edu", "name": "Test"})
        with self.assertRaises(AppError) as ctx2:
            my_reservation_ep(self.event_id, bad_token2, self.repos)
        self.assertEqual(ctx2.exception.code, "UNAUTHORIZED")

        # Token with whitespace-only sub
        bad_token3 = encode_token({"sub": "   ", "email": "test@uci.edu", "name": "Test"})
        with self.assertRaises(AppError) as ctx3:
            my_reservation_ep(self.event_id, bad_token3, self.repos)
        self.assertEqual(ctx3.exception.code, "UNAUTHORIZED")

    def test_cancel_my_reservation_invalid_token(self) -> None:
        """Test cancel_my_reservation_ep with invalid token (line 164)."""
        from ics_connect.util.jwt import encode_token

        # Token with invalid user_id
        bad_token = encode_token({"sub": None, "email": "test@uci.edu", "name": "Test"})
        with self.assertRaises(AppError) as ctx:
            cancel_my_reservation_ep(self.event_id, bad_token, self.repos)
        self.assertEqual(ctx.exception.code, "UNAUTHORIZED")

    def test_cancel_my_reservation_not_found(self) -> None:
        """Test cancel_my_reservation_ep when user has no reservation (line 170)."""
        from ics_connect.util.jwt import encode_token

        # Create valid auth token for user with no reservation
        user_id = "user-no-reservation"
        auth_token = encode_token({"sub": user_id, "email": "norsvp@uci.edu", "name": "No RSVP"})

        # Try to cancel when no reservation exists
        with self.assertRaises(AppError) as ctx:
            cancel_my_reservation_ep(self.event_id, auth_token, self.repos)
        self.assertEqual(ctx.exception.code, "NOT_FOUND")
