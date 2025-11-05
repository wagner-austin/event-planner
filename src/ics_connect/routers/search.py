from __future__ import annotations

import datetime as dt
from typing import Annotated

from fastapi import APIRouter, Depends, Request

from ..di import provide_repos
from ..endpoints import SearchParams, search_ep
from ..repositories.protocols import Repos
from ..types import SearchResult as SearchResultTD

router = APIRouter()

StoreDep = Annotated[Repos, Depends(provide_repos)]


def search(request: Request, store: StoreDep) -> SearchResultTD:
    qp = request.query_params
    q = qp.get("q")
    start_raw = qp.get("start")
    to_raw = qp.get("to")
    limit_raw = qp.get("limit")
    offset_raw = qp.get("offset")
    start_dt = dt.datetime.fromisoformat(start_raw) if start_raw else None
    to_dt = dt.datetime.fromisoformat(to_raw) if to_raw else None
    limit = int(limit_raw) if limit_raw is not None else 10
    offset = int(offset_raw) if offset_raw is not None else 0
    params = SearchParams(q=q, start=start_dt, to=to_dt, limit=limit, offset=offset)
    return search_ep(params, store)


router.add_api_route("/search", search, methods=["GET"])

__all__ = ["router"]
