from __future__ import annotations

from fastapi import Request
from fastapi.responses import JSONResponse


class AppError(Exception):
    def __init__(self, code: str, message: str, details: object | None = None) -> None:
        super().__init__(message)
        self.code = code
        self.message = message
        self.details = details or {}


def error_envelope(code: str, message: str, details: object | None = None) -> dict[str, object]:
    det: object = {} if details is None else details
    return {"error": {"code": code, "message": message, "details": det}}


async def app_error_handler(_request: Request, exc: AppError) -> JSONResponse:
    return JSONResponse(status_code=400, content=error_envelope(exc.code, exc.message, exc.details))


async def unhandled_error_handler(_request: Request, exc: Exception) -> JSONResponse:
    return JSONResponse(status_code=500, content=error_envelope("INTERNAL_ERROR", str(exc)))
