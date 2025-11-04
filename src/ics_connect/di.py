from __future__ import annotations

from collections.abc import Iterator

from .db import Store, get_store


def provide_store() -> Iterator[Store]:
    yield from get_store()
