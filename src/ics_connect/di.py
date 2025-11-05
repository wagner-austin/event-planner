from __future__ import annotations

import os
from collections.abc import Iterator

from .db import Store, get_engine, get_session, get_store
from .repositories.inmemory import InMemoryRepos
from .repositories.protocols import Repos
from .repositories.sql import SQLRepos
from .repositories.sql_models import create_all as sql_create_all


def provide_store() -> Iterator[Store]:
    yield from get_store()


def provide_repos() -> Iterator[Repos]:
    db_url = os.environ.get("DATABASE_URL")
    if db_url:
        engine = get_engine(db_url)
        sql_create_all(engine)
        for session in get_session(engine):
            yield SQLRepos(session)
        return
    # In-memory repos wrapping the global Store
    # Use the same store instance provided by provide_store/get_store
    store_iter = get_store()
    store = next(store_iter)
    yield InMemoryRepos(store)
