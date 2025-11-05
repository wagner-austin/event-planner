from __future__ import annotations

from fastapi import APIRouter

from ..endpoints import health_ep

router = APIRouter()


def health() -> dict[str, bool]:
    return health_ep()


router.add_api_route("/health", health, methods=["GET"])


__all__ = ["router"]
