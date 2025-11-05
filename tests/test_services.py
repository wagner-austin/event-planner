from __future__ import annotations

import datetime as dt
import unittest

from ics_connect.db import Store
from ics_connect.errors import AppError
from ics_connect.models import ReservationStatus
from ics_connect.repositories.inmemory import InMemoryRepos
from ics_connect.services.events import CreateEventInput, EventService
from ics_connect.services.reservations import ReservationService, ReserveInput


class TestServices(unittest.TestCase):
    def setUp(self) -> None:
        self.store = Store()
        self.repos = InMemoryRepos(self.store)
        now = dt.datetime.utcnow()
        self.event_service = EventService(self.repos)
        created = self.event_service.create(
            CreateEventInput(
                title="E",
                starts_at=now + dt.timedelta(hours=1),
                ends_at=now + dt.timedelta(hours=2),
                description=None,
                type=None,
                location_text=None,
                public=True,
                requires_join_code=False,
                capacity=1,
            )
        )
        self.event = created.event

    def test_reserve_confirmed_and_waitlist_promotion(self) -> None:
        svc = ReservationService(self.repos)
        res1 = svc.reserve(self.event, ReserveInput(display_name="A", email=None, join_code=None))
        self.assertEqual(res1.reservation.status, ReservationStatus.CONFIRMED)
        res2 = svc.reserve(self.event, ReserveInput(display_name="B", email=None, join_code=None))
        self.assertEqual(res2.reservation.status, ReservationStatus.WAITLISTED)
        svc.cancel_and_maybe_promote(self.event.id, res1.reservation.id)
        promoted = self.store.reservations[res2.reservation.id]
        self.assertEqual(promoted.status, ReservationStatus.CONFIRMED)

    def test_event_full_results_waitlist(self) -> None:
        now = dt.datetime.utcnow()
        ev2 = self.event_service.create(
            CreateEventInput(
                title="F",
                starts_at=now + dt.timedelta(hours=3),
                ends_at=now + dt.timedelta(hours=4),
                description=None,
                type=None,
                location_text=None,
                public=True,
                requires_join_code=False,
                capacity=0,
            )
        ).event
        svc = ReservationService(self.repos)
        res = svc.reserve(ev2, ReserveInput(display_name="X", email=None, join_code=None))
        self.assertEqual(res.reservation.status, ReservationStatus.WAITLISTED)

    def test_join_code_required_invalid(self) -> None:
        # Create event with join code required
        now = dt.datetime.utcnow()
        created2 = self.event_service.create(
            CreateEventInput(
                title="J",
                starts_at=now + dt.timedelta(hours=5),
                ends_at=now + dt.timedelta(hours=6),
                description=None,
                type=None,
                location_text=None,
                public=True,
                requires_join_code=True,
                capacity=1,
            )
        )
        svc = ReservationService(self.repos)
        with self.assertRaises(AppError):
            svc.reserve(created2.event, ReserveInput(display_name="Y", email=None, join_code=None))

    def test_cancel_not_found_raises(self) -> None:
        svc = ReservationService(self.repos)
        with self.assertRaises(AppError):
            svc.cancel_and_maybe_promote("missing-event", "missing-reservation")

    def test_status_none_branch_when_waitlist_disabled(self) -> None:
        # Force event to have zero capacity and waitlist disabled
        ev = self.event
        ev.capacity = 0
        ev.waitlist_enabled = False
        svc = ReservationService(self.repos)
        with self.assertRaises(AppError):
            svc.reserve(ev, ReserveInput(display_name="N", email=None, join_code=None))

    def test_cancel_already_canceled_and_no_waitlist(self) -> None:
        # Cancel twice should not error
        svc = ReservationService(self.repos)
        res1 = svc.reserve(self.event, ReserveInput(display_name="Z", email=None, join_code=None))
        svc.cancel_and_maybe_promote(self.event.id, res1.reservation.id)
        # Cancel again (already canceled)
        svc.cancel_and_maybe_promote(self.event.id, res1.reservation.id)
