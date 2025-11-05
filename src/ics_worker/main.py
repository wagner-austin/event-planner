from __future__ import annotations

from typing import Final

import discord
from discord import app_commands

from ics_worker.client import BotAPIClient
from ics_worker.config import WorkerConfig
from ics_worker.payload import build_create_payload, iso_now_plus, to_json_create_payload


class BotApp(discord.Client):
    def __init__(self, cfg: WorkerConfig) -> None:
        super().__init__(intents=discord.Intents.none())
        self.cfg: Final = cfg
        self.tree = app_commands.CommandTree(self)
        self.api = BotAPIClient(cfg)

        @self.tree.command(name="event_create", description="Create an event (defaults now+1h/2h)")
        @app_commands.describe(title="Title only; defaults used for other fields")
        async def event_create(
            interaction: discord.Interaction,
            title: str,
        ) -> None:
            start_iso = iso_now_plus(1)
            end_iso = iso_now_plus(2)
            body: dict[str, object] = {
                "title": title,
                "description": None,
                "type": None,
                "starts_at": start_iso,
                "ends_at": end_iso,
                "location_text": None,
                "capacity": 1,
                "public": True,
                "requires_join_code": False,
                "tags": [],
            }
            try:
                payload_typed = build_create_payload(body)
                json_payload = to_json_create_payload(payload_typed)
                resp = self.api.create_event(json_payload)
                eid = str(resp.get("event_id", ""))
                await interaction.response.send_message(
                    f"Event created: {title} (id={eid})",
                    ephemeral=True,
                )
            except Exception as e:
                await interaction.response.send_message(
                    f"Failed to create event: {e}", ephemeral=True
                )
                raise

    async def setup_hook(self) -> None:
        # Sync global commands
        await self.tree.sync()


def main() -> None:
    cfg = WorkerConfig.from_env()
    app = BotApp(cfg)
    app.run(cfg.discord_bot_token)


if __name__ == "__main__":
    main()
