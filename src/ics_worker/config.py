from __future__ import annotations

import os
from dataclasses import dataclass


@dataclass(frozen=True)
class WorkerConfig:
    discord_bot_token: str
    discord_application_id: str
    api_url: str
    bot_key: str

    @staticmethod
    def from_env() -> WorkerConfig:
        token = os.getenv("DISCORD_BOT_TOKEN", "").strip()
        app_id = os.getenv("DISCORD_APPLICATION_ID", "").strip()
        api_url = os.getenv("API_URL", "").strip()
        bot_key = os.getenv("BOT_KEY", "").strip()
        if not token or not app_id or not api_url or not bot_key:
            missing: list[str] = []
            if not token:
                missing.append("DISCORD_BOT_TOKEN")
            if not app_id:
                missing.append("DISCORD_APPLICATION_ID")
            if not api_url:
                missing.append("API_URL")
            if not bot_key:
                missing.append("BOT_KEY")
            raise RuntimeError("Missing env: " + ",".join(missing))
        return WorkerConfig(
            discord_bot_token=token,
            discord_application_id=app_id,
            api_url=api_url.rstrip("/"),
            bot_key=bot_key,
        )


__all__ = ["WorkerConfig"]

