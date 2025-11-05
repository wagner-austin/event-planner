from __future__ import annotations

from collections.abc import Iterator
from collections.abc import Iterator as TIterator
from dataclasses import dataclass, field

from sqlalchemy import create_engine
from sqlalchemy.engine import Engine
from sqlalchemy.orm import Session, sessionmaker

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


def get_engine(url: str) -> Engine:
    return create_engine(url, echo=False, future=True)


def get_session(engine: Engine) -> TIterator[Session]:
    session_local = sessionmaker(bind=engine, autoflush=False, autocommit=False, future=True)
    session = session_local()
    try:
        yield session
    finally:
        session.close()
