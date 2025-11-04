# ICS Connect

UCI ICS/CS event discovery and RSVP with Discord notifications. Static web frontend, FastAPI backend, and a Discord bot. Strict typing, linting, tests, and guard scripts enforce code quality.

- Design Doc: docs/ICS-Connect-Design.md
- Stack: FastAPI + SQLModel + PostgreSQL (Railway), discord.py bot, static HTML/CSS+JS (GitHub Pages)

## Quick Start

Prereqs: Python 3.11+, Poetry 1.8+, Docker (for compose).

```
# Install deps and lock
make check   # runs lint + tests w/ coverage (will lock & install)

# Or individually
poetry lock
poetry install
make lint
make test
```

## Make Commands
- make lint  → poetry lock + install, ruff (fix), mypy --strict, yamllint, guard scripts
- make test  → poetry install, pytest with coverage (term + XML)
- make check → lint + test
- make start → docker compose up (db, api, bot) with build
- make stop  → docker compose stop
- make clean → stop, remove volumes/images, rebuild

## Repo Layout
- src/ics_connect/ → backend package (FastAPI app, services, repos, schemas)
- web/ → static site (HTML/CSS/JS)
- bot/ → discord.py bot
- tools/guards/ → guard scripts (typing/exceptions/logging)
- tests/ → pytest tests
- docs/ → design docs

## Quality Gates
- mypy --strict (no Any, no casts, no ignores)
- ruff lint/format, yamllint
- guard scripts: forbid Any/cast/type: ignore; forbid bare except; forbid print
- pytest + coverage (target ≥ 85% on src/ics_connect)

## Environment (dev)
- API: DATABASE_URL, JWT_SECRET, CORS_ORIGIN, RATE_LIMIT_WRITE, RATE_LIMIT_READ, PORT
- Bot: DISCORD_BOT_TOKEN, API_URL, BOT_KEY
- Web: web/config.json sets API_BASE_URL

See the design doc for endpoints, data model, and deployment details.
