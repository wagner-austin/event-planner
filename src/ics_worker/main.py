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
        self._last_event_by_user: dict[int, str] = {}
        self._register_commands()

    def _register_commands(self) -> None:  # noqa: PLR0915
        @self.tree.command(
            name="event_create", description="Create an event (defaults now+1h/2h)"
        )
        @app_commands.describe(title="Title only; defaults used for other fields")
        async def event_create(
            interaction: discord.Interaction, title: str,
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
                # Cache last event for user
                self._last_event_by_user[interaction.user.id] = eid
                # Build a nice embed
                emb = discord.Embed(title="Event Created", description=resp.get("title", ""))
                emb.add_field(name="Starts", value=str(resp.get("starts_at", "")), inline=True)
                emb.add_field(name="Ends", value=str(resp.get("ends_at", "")), inline=True)
                loc = resp.get("location_text", None)
                emb.add_field(name="Location", value=str(loc or "(none)"), inline=False)
                emb.add_field(name="Capacity", value=str(resp.get("capacity", 0)), inline=True)
                privacy = "public" if bool(resp.get("public", False)) else "private"
                rjc = "yes" if bool(resp.get("requires_join_code", False)) else "no"
                emb.add_field(name="Privacy", value=f"{privacy}, join code: {rjc}", inline=True)
                emb.set_footer(text=f"Event ID: {eid}")
                await interaction.response.send_message(embed=emb, ephemeral=False)
            except Exception as e:
                await interaction.response.send_message(
                    f"Failed to create event: {e}", ephemeral=True
                )
                raise

        async def _auto_status(
            _interaction: discord.Interaction, current: str
        ) -> list[app_commands.Choice[str]]:
            items = self.api.search_events(current)
            out: list[app_commands.Choice[str]] = []
            for it in items:
                label = f"{it['title']} · {it['starts_at']}"
                out.append(app_commands.Choice(name=label, value=it["id"]))
            return out

        @self.tree.command(name="status", description="Show RSVP counts for an event")
        @app_commands.describe(event_id="Pick from suggestions or leave empty for last created")
        @app_commands.autocomplete(event_id=_auto_status)
        async def status(
            interaction: discord.Interaction, event_id: str | None = None
        ) -> None:
            try:
                eid = event_id or self._last_event_by_user.get(interaction.user.id, "")
                if not eid:
                    await interaction.response.send_message(
                        "Provide event_id or create an event first.", ephemeral=True
                    )
                    return
                detail = self.api.get_event_detail(eid)
                emb = discord.Embed(title="Event Status", description=detail.get("title", ""))
                emb.add_field(name="Starts", value=str(detail.get("starts_at", "")), inline=True)
                emb.add_field(name="Ends", value=str(detail.get("ends_at", "")), inline=True)
                loc_val = str(detail.get("location_text") or "(none)")
                emb.add_field(name="Location", value=loc_val, inline=False)
                emb.add_field(name="Capacity", value=str(detail.get("capacity", 0)), inline=True)
                emb.add_field(name="Confirmed", value=str(detail.get("confirmed", 0)), inline=True)
                wl_val = str(detail.get("waitlisted", 0))
                emb.add_field(name="Waitlisted", value=wl_val, inline=True)
                privacy = "public" if bool(detail.get("public", False)) else "private"
                rjc = "yes" if bool(detail.get("requires_join_code", False)) else "no"
                emb.add_field(name="Privacy", value=f"{privacy}, join code: {rjc}", inline=False)
                emb.set_footer(text=f"Event ID: {eid}")
                await interaction.response.send_message(embed=emb, ephemeral=False)
            except Exception as e:
                await interaction.response.send_message(
                    f"Failed to get status: {e}", ephemeral=True
                )
                raise

        @self.tree.command(
            name="list",
            description="List recent events; use /status autocomplete for details",
        )
        @app_commands.describe(q="Optional search query", limit="Number of events to list (1-10)")
        async def list_(
            interaction: discord.Interaction, q: str | None = None, limit: int = 5
        ) -> None:
            lim = max(1, min(10, int(limit)))
            try:
                items = self.api.search_events(q or "")[:lim]
                if not items:
                    await interaction.response.send_message("No events found.", ephemeral=True)
                    return
                emb = discord.Embed(title="Events")
                for it in items:
                    eid = it["id"]
                    title = it["title"]
                    start = it["starts_at"]
                    counts = self.api.get_event_counts(eid)
                    val = (
                        f"{start} · id={eid}\n"
                        f"confirmed={counts['confirmed']}, waitlisted={counts['waitlisted']}"
                    )
                    emb.add_field(name=title, value=val, inline=False)
                await interaction.response.send_message(embed=emb, ephemeral=False)
            except Exception as e:
                await interaction.response.send_message(
                    f"Failed to list events: {e}", ephemeral=True
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
