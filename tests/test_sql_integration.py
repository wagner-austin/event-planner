from __future__ import annotations

import datetime as dt
import os
import unittest

from ics_connect.di import provide_repos
from ics_connect.models import Reservation, ReservationStatus
from ics_connect.services.events import CreateEventInput, EventService
from ics_connect.services.reservations import ReservationService, ReserveInput


class TestSQLIntegration(unittest.TestCase):
    def setUp(self) -> None:
        os.environ["DATABASE_URL"] = "sqlite:///:memory:"

    def test_sql_create_reserve_cancel_promote(self) -> None:
        repos = next(provide_repos())
        now = dt.datetime.now(dt.UTC)
        ev_svc = EventService(repos)
        created = ev_svc.create(
            CreateEventInput(
                title="SQL Alpha",
                starts_at=now + dt.timedelta(hours=1),
                ends_at=now + dt.timedelta(hours=2),
                description=None,
                type=None,
                location_text=None,
                discord_link=None,
                website_link=None,
                public=True,
                requires_join_code=False,
                capacity=1,
            )
        )
        ev = created.event
        res_svc = ReservationService(repos)
        r1 = res_svc.reserve(ev, ReserveInput(display_name="A", email=None, join_code=None))
        r2 = res_svc.reserve(ev, ReserveInput(display_name="B", email=None, join_code=None))
        self.assertEqual(r1.reservation.status, "confirmed")
        self.assertEqual(r2.reservation.status, "waitlisted")
        # Exercise repo get/list/counts
        _ = repos.events.get(ev.id)
        _ = repos.events.list_all()
        self.assertEqual(repos.reservations.count_confirmed(ev.id), 1)
        self.assertEqual(repos.reservations.count_waitlisted(ev.id), 1)
        # Early return path of update (missing ID)
        missing = Reservation(
            id="missing",
            event_id=ev.id,
            user_id=None,
            display_name="Z",
            email=None,
            status=ReservationStatus.WAITLISTED,
            promoted_at=None,
        )
        repos.reservations.update(missing)
        res_svc.cancel_and_maybe_promote(ev.id, r1.reservation.id)
        got2 = repos.reservations.get(r2.reservation.id)
        self.assertIsNotNone(got2)
        if got2 is not None:
            self.assertEqual(got2.status, "confirmed")
