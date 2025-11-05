from __future__ import annotations

import datetime as dt

from .errors import AppError


def require_str(d: dict[str, object], key: str) -> str:
    v = d.get(key)
    if isinstance(v, str):
        return v
    raise AppError("INVALID_INPUT", f"'{key}' must be a string")


def get_optional_str(d: dict[str, object], key: str) -> str | None:
    v = d.get(key)
    if v is None or isinstance(v, str):
        return v
    raise AppError("INVALID_INPUT", f"'{key}' must be a string or null")


def require_bool(d: dict[str, object], key: str) -> bool:
    v = d.get(key)
    if isinstance(v, bool):
        return v
    raise AppError("INVALID_INPUT", f"'{key}' must be a boolean")


def require_int(d: dict[str, object], key: str) -> int:
    v = d.get(key)
    if isinstance(v, int):
        return v
    raise AppError("INVALID_INPUT", f"'{key}' must be an integer")


def parse_datetime(value: str, field: str) -> dt.datetime:
    try:
        return dt.datetime.fromisoformat(value)
    except Exception as exc:  # pragma: no cover - defensive
        raise AppError("INVALID_INPUT", f"'{field}' must be ISO datetime") from exc


def parse_string_list(d: dict[str, object], key: str) -> list[str]:
    v = d.get(key)
    if v is None:
        return []
    if isinstance(v, list) and all(isinstance(i, str) for i in v):
        return list(v)
    raise AppError("INVALID_INPUT", f"'{key}' must be a list of strings")


__all__ = [
    "require_str",
    "get_optional_str",
    "require_bool",
    "require_int",
    "parse_datetime",
    "parse_string_list",
]

