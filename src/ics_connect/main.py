from __future__ import annotations

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from . import __version__
from .errors import AppError, app_error_handler, unhandled_error_handler
from .logging import RequestLoggingMiddleware, setup_logging
from .middleware.rate_limit import RateLimiter, RateLimitMiddleware
from .routers import events_router, health_router, search_router
from .settings import Settings


def create_app() -> FastAPI:
    setup_logging()
    settings = Settings.from_env()

    app = FastAPI(title="ICS Connect API", version=__version__)

    # Middleware (rate limit first, then logging)
    limiter = RateLimiter(
        read_limit_per_min=settings.rate_limit_read,
        write_limit_per_min=settings.rate_limit_write,
    )
    app.add_middleware(RateLimitMiddleware, limiter=limiter)
    app.add_middleware(RequestLoggingMiddleware)
    cors_origins = (
        settings.cors_origins
        if settings.cors_origins
        else ([settings.cors_origin] if settings.cors_origin else ["*"])
    )
    app.add_middleware(
        CORSMiddleware,
        allow_origins=cors_origins,
        allow_credentials=False,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    # Exception handlers
    app.add_exception_handler(AppError, app_error_handler)
    app.add_exception_handler(Exception, unhandled_error_handler)

    # Routers (versioned)
    app.include_router(health_router, prefix="/api/v1")
    app.include_router(search_router, prefix="/api/v1")
    from .routers import auth_router
    app.include_router(auth_router, prefix="/api/v1")
    app.include_router(events_router, prefix="/api/v1")

    return app


app = create_app()


__all__ = ["app", "create_app"]
