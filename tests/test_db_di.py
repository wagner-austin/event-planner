from __future__ import annotations

import unittest

from ics_connect.db import Store, get_store, init_db
from ics_connect.di import provide_store


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

