from __future__ import annotations

import os
import unittest

from ics_connect.db import Store, get_engine, get_session, get_store, init_db
from ics_connect.di import provide_repos, provide_store


class TestDBDI(unittest.TestCase):
    def test_init_and_get_store(self) -> None:
        init_db()
        gen = get_store()
        store: Store = next(gen)
        self.assertIsInstance(store, Store)

    def test_provide_store(self) -> None:
        gen = provide_store()
        store: Store = next(gen)
        self.assertIsInstance(store, Store)

    def test_provide_repos_sql(self) -> None:
        if "DATABASE_URL" in os.environ:
            del os.environ["DATABASE_URL"]
        gen = provide_repos()
        repos = next(gen)
        # basic structural behavior
        events = repos.events.list_all()
        self.assertIsInstance(events, list)

    def test_engine_and_session(self) -> None:
        # Exercise engine + session helpers with SQLite
        engine = get_engine("sqlite:///:memory:")
        it = get_session(engine)
        session = next(it)
        # Ensure session usable
        self.assertIsNotNone(session.bind)
        # Also exercise provide_repos when DATABASE_URL is set
        os.environ["DATABASE_URL"] = "sqlite:///:memory:"
        gen2 = provide_repos()
        repos2 = next(gen2)
        _ = repos2.events.list_all()
        # Exhaust generator to cover return path
        with self.assertRaises(StopIteration):
            _ = next(gen2)
