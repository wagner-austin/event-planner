from __future__ import annotations

__all__ = [
    "events_router",
    "search_router",
    "health_router",
    "auth_router",
]

from .auth import router as auth_router
from .events import router as events_router
from .health import router as health_router
from .search import router as search_router
