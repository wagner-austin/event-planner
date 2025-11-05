from __future__ import annotations

from typing import Annotated

from fastapi import APIRouter, Header

from ..endpoints import login_ep, me_ep
from ..types import AuthResponse, ProfileBody, ProfileOut

router = APIRouter()


def login(body: dict[str, object]) -> AuthResponse:
    payload: ProfileBody = {
        "email": str(body.get("email", "")),
        "display_name": str(body.get("display_name", "")),
    }
    return login_ep(payload)


AuthHeader = Annotated[str | None, Header(convert_underscores=False)]


def me(authorization: AuthHeader = None) -> ProfileOut:
    if authorization is None or not authorization.startswith("Bearer "):
        raise ValueError("Missing or invalid Authorization header")
    token = authorization[len("Bearer ") :]
    return me_ep(token)


router.add_api_route("/auth/login", login, methods=["POST"])
router.add_api_route("/auth/me", me, methods=["GET"])

__all__ = ["router"]

