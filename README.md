# ICS Connect

UCI ICS/CS event discovery and RSVP with Discord notifications. Static web frontend, FastAPI backend, and a Discord bot. Strict typing, linting, tests, and guard scripts enforce code quality.

- Design Doc: docs/ICS-Connect-Design.md
- Stack: FastAPI + SQLAlchemy (SQLite in dev; PostgreSQL optional on Railway), discord.py bot, static HTML/CSS+JS (GitHub Pages)

## Quick Start

Prereqs: Python 3.11+, Poetry 1.8+, Docker (for compose).

```
# Install deps and run all checks
make check

# Or individually
poetry lock
poetry install
make lint
make test
```

## Make Commands
- `make lint`  → poetry lock + install, ruff (fix), mypy --strict, yamllint, guard scripts
- `make test`  → poetry install, pytest with coverage (term + XML)
- `make check` → lint + test
- `make serve` → open test-frontend.html + start local HTTP server on :8080
- `make start` → docker compose up (db optional, api) with build
- `make stop`  → docker compose stop
- `make clean` → stop, remove volumes/images, rebuild

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
- pytest + coverage: 100% statements and branches on src/ics_connect

Frontend (Node) checks:
- Requires `npm` and a functional `web/node_modules`.
- The `web-check` step uses existing `node_modules` by default to avoid Windows file-lock issues (e.g., esbuild.exe in use).
- To force a fresh install, set `WEB_CHECK_INSTALL=1` in your environment before `make check`:
  - PowerShell: `$env:WEB_CHECK_INSTALL = '1'; make check`
  - Bash: `WEB_CHECK_INSTALL=1 make check`
  If install errors persist, close editors/antivirus holding locks, then run `cd web && npm ci` manually.

## Environment (dev)
- API (env, prefixed with `ICS_`):
  - `ICS_JWT_SECRET` (required in prod; defaults to `dev-secret` in dev)
  - `ICS_CORS_ORIGIN` (single origin) or `ICS_CORS_ORIGINS` (comma-separated list)
  - `ICS_RATE_LIMIT_WRITE` (default 20), `ICS_RATE_LIMIT_READ` (default 60)
  - `ICS_PORT` (default 8000)
  - `DATABASE_URL` (optional) e.g. `sqlite:///:memory:` or `postgresql+psycopg2://user:pass@host:5432/db`
- Bot: `DISCORD_BOT_TOKEN`, `API_URL`, `BOT_KEY` (optional shared secret)
- Web: `web/config.json` sets `API_BASE_URL`

See the design doc for endpoints, data model, and deployment details.

## Frontend Testing

Test the API from a browser:

```bash
make serve
# Opens test-frontend.html and starts HTTP server on http://localhost:8080
# Test all API endpoints with CORS, JSON parsing, auth flows
```

## GitHub Pages Deployment

Deploy the frontend to GitHub Pages:

1. **Create `web/` directory** with your HTML/CSS/JS files
2. **Add `web/config.js`** with API base URL:
   ```javascript
   const API_BASE = 'https://event-planner-production-d03d.up.railway.app/api/v1';
   ```
3. **Push to GitHub:**
   ```bash
   git add web/
   git commit -m "Add frontend"
   git push
   ```
4. **Enable GitHub Pages:**
   - Go to repo Settings → Pages
   - Source: Deploy from branch
   - Branch: `main`, Folder: `/web`
   - Save
5. **Access at:** `https://<username>.github.io/<repo-name>/`

No build step needed - just static HTML/CSS/JS!

## Docker

Build and run the API locally using Docker Compose:

```
docker compose build api
docker compose up api
# API on http://localhost:8000
```

Environment overrides:

```
# Example: set a non-default secret and CORS origin
$env:ICS_JWT_SECRET = (python - <<<'import hashlib;print(hashlib.sha256(b"local").hexdigest())')
$env:ICS_CORS_ORIGIN = "https://your-frontend.example"
docker compose up --build api
```

## CI

GitHub Actions workflow runs `make check` (lint, type-check, guards, tests with coverage) on PRs and pushes (Python 3.11 and 3.12).

## Railway

- Service: deploy the API using `Dockerfile.api` (recommended) or Nixpacks.
- Env vars: set `ICS_JWT_SECRET`, `ICS_CORS_ORIGIN` (or `ICS_CORS_ORIGINS`), `ICS_RATE_LIMIT_READ/WRITE`, and optionally `DATABASE_URL`.
- Port: the container listens on `ICS_PORT` (default 8000).
- Data: no volumes required. If you set `DATABASE_URL`, ensure your Railway Postgres plugin is attached and the URL is injected.
- Health: `GET /api/v1/health` returns `{ "ok": true }`.


Note: When deploying with Railway Railpack (no Dockerfile), this repo includes a Procfile to start FastAPI via uvicorn: web: uvicorn ics_connect.main:app --host 0.0.0.0 --port .
