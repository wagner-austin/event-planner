from __future__ import annotations

from collections.abc import Iterator
from dataclasses import dataclass, field

from .models import Event, Reservation


@dataclass
class Store:
    events: dict[str, Event] = field(default_factory=dict)
    reservations: dict[str, Reservation] = field(default_factory=dict)


_STORE = Store()


def init_db() -> None:
    return None


def get_store() -> Iterator[Store]:
    yield _STORE
