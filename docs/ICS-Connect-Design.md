# ICS Connect — Design Doc (v1)

UCI‑exclusive platform for ICS/CS students to discover club events, RSVP, and receive Discord notifications. Discord-first admin; static website for discovery, search, map, and RSVP. Backend is a versioned API; frontend is static HTML/CSS with minimal JS calling the API.

## Goals
- Officers create/manage events via Discord slash commands.
- Public web listing with search, filters, long scroll, and map view.
- RSVP with capacity and optional waitlist; no grouping/team matching in v1.
- Discord notifications for new events and updates.
- No email sending in v1; optional lightweight profile (unverified UCI email) for convenience.

## Non‑Goals (v1)
- No SSO/OAuth; no email verification.
- No advanced grouping/matching.
- No payments; no external geocoding; no live ICS calendar import (cached list only).

## Stages
- Stage 1: Club officers create and post events (Discord + minimal web admin).
- Stage 2: Students discover and RSVP to events (search + long scroll + event pages).
- Stage 3: Map view of events on campus (Leaflet + clustering).

---

## Architecture
- Frontend: static HTML/CSS + minimal JS on GitHub Pages. Reads `web/config.json` for API base URL.
- Backend API: FastAPI + SQLModel + PostgreSQL on Railway. Versioned under `/api/v1`. CORS restricted to GH Pages origin.
- Discord Bot: `discord.py` 2.x on Railway; calls API with `X-Bot-Key`.
- Database: PostgreSQL (Railway). Tables for users, clubs, events, reservations, external events, subscriptions.
- Optional: Upstash Redis for caching (e.g., `/search` results, external events cache) and task queue (RQ worker) if needed.

## Engineering Standards (Enforced)
- Strict typing (Python) with mypy `--strict` across `src/` and `tests/`:
  - No `Any`, no `typing.cast`, no `# type: ignore`, no implicit `Any`.
  - Full type hints on all functions (args and return) and module-level constants.
  - Use `typing.Protocol` for interfaces and DI boundaries.
- DRY, Modular, Consistent:
  - Layers: domain (entities/VOs) → repositories (Protocols + SQLModel impl) → services (pure business logic) → routers (I/O only) → infra (logging, settings, DI, middleware).
  - Single error envelope and logging schema.
- Reliability & Robustness:
  - Centralized structured logging (JSON) with request/trace IDs; no `print` anywhere.
  - Exception policy: no silent exceptions; centralized handlers map to error envelope and re-raise appropriately.
  - Reservation logic runs inside DB transactions; uses row locking to avoid race conditions.
- Tooling & Policy:
  - Poetry for deps; Dockerized services; Makefile as the single command surface.
  - Lint src and tests: Ruff, mypy strict, YAML lint, plus guard scripts.
  - CI runs lint, guards, and tests with coverage; blocks merge on failure.

## Repository Layout
- `src/ics_connect/`
  - `main.py` (FastAPI app: routers, middleware, lifespan)
  - `settings.py` (pydantic-settings; env typed config)
  - `db.py` (engine/session factory; transactional helpers)
  - `logging.py` (JSON logging setup; request ID middleware)
  - `errors.py` (domain/HTTP errors; exception handlers)
  - `di.py` (ServiceContainer; typed providers)
  - `domain/` (typed dataclasses/VOs)
  - `repositories/` (Protocols + SQL implementations)
  - `services/` (EventService, ReservationService, NotificationService)
  - `schemas/` (Pydantic request/response models; strict types)
  - `routers/` (`events.py`, `reservations.py`, `search.py`, `auth.py`, `clubs.py`, `bot.py`, `uci.py`, `health.py`)
  - `util/` (jwt, hashing, ids, time, cors)
- `web/` (static site: `index.html`, `event.html`, `map.html`, `admin.html`, assets, js, `config.json`)
- `bot/` (discord.py app)
- `tools/guards/` (typing_guard.py, exceptions_guard.py, logging_guard.py) + `tools/guard.py` orchestrator
- `tests/` (unit + integration; strict-typed)
- `docs/` (this design doc and related docs)

## Data Model
- users: `id uuid`, `email` (uci/ics domains), `display_name`, `verified bool=false`, `created_at`.
- clubs: `id`, `name`, `slug`, `discord_guild_id unique`, `created_at`.
- events: `id`, `club_id?`, `title`, `description`, `type`, `starts_at`, `ends_at`, `location_text`, `lat?`, `lon?`, `tags jsonb`, `public bool=true`, `requires_join_code bool=false`, `join_code_hash?`, `admin_key_hash`, `capacity int`, `waitlist_enabled bool=true`, `created_at`. Indexes: `starts_at`, `lower(title)`.
- reservations: `id`, `event_id`, `user_id?`, `display_name`, `email?`, `status enum('confirmed','waitlisted','canceled')`, `promoted_at?`, `created_at`. Index: `(event_id,status,created_at)`.
- external_events: `id`, `source`, `external_id unique`, `title`, `starts_at`, `ends_at`, `location_text`, `url`, `category`, `created_at`.
- discord_subscriptions: `id`, `club_id`, `discord_user_id`, `created_at`.
- discord_channels: `id`, `club_id`, `channel_id`, `purpose enum('announcements')`, `created_at`.

Store only hashes for join/admin codes (argon2/bcrypt). Never store raw values.

## API (v1)
- Base: `/api/v1`; Envelopes: success `{ data: ... }`, error `{ error: { code, message, details? } }`.
- Headers: `Authorization: Bearer <profileToken|reservationToken>`, `X-Admin-Key`, `X-Bot-Key`, `X-API-Version: 1.0`.

Auth/Profile
- POST `/auth/profile` → upsert lightweight profile (uci/ics only).
  - Req `{ email, displayName }`
  - Res `{ data: { token, user: { id, email, displayName, verified:false } } }`
  - 400 `INVALID_EMAIL_DOMAIN`
- GET `/me` (profile token) → `{ data: { user, myReservations:[{eventId,reservationId,status}] } }`

Clubs
- POST `/clubs` (X-Bot-Key) `{ name, discordGuildId }` → `{ data: { club } }`
- GET `/clubs/{id}` → `{ data: { club } }`

Events
- POST `/events` (X-Admin-Key or X-Bot-Key)
  - `{ title, description?, type?, startsAt, endsAt, locationText, capacity, public, requiresJoinCode?, tags?, clubId? }`
  - Returns `{ data: { event, joinCode?, adminKey? } }` (secrets only on creation)
- GET `/events/{id}` → `{ data: { event: { ...public, capacity, confirmedCount, waitlistCount } } }`
- GET `/events/{id}/admin` (X-Admin-Key) → `{ data: { event, reservations } }`
- PATCH `/events/{id}` (X-Admin-Key) → `{ data: { event } }`

Reservations (RSVP)
- POST `/events/{id}/reserve`
  - `{ displayName, email?, joinCode? }` (uses profile if provided)
  - Confirms if capacity available; else waitlists if enabled; else `409 EVENT_FULL`
  - Returns `{ data: { reservationId, status, token } }`
- GET `/events/{id}/my-reservation` (reservation token) → `{ data: { reservation } }`
- DELETE `/events/{id}/my-reservation` → 204; promotes oldest waitlisted if any
- GET `/events/{id}/reservations` (X-Admin-Key) → `{ data: { reservations } }`

Search/Listing
- GET `/search?q=&scope=public|uci|all&from=&to=&type?=&clubId?=&limit=20&offset=0`
  - `{ data: { events:[{ id,title,startsAt,endsAt,locationText,type,tags,source,capacity,confirmedCount }], total } }`

Discord Bot Integration
- POST `/bot/events` (X-Bot-Key)
  - `{ guildId, channelId?, title, startsAt, endsAt, locationText, capacity, public, tags?, type?, description? }` → `{ data: { eventId, eventUrl } }`
- GET `/bot/events/{id}/status` (X-Bot-Key) → `{ data: { confirmedCount, waitlistCount, capacity } }`
- POST `/bot/notify` (X-Bot-Key) `{ eventId, channelId?, message }` → 202
- POST `/bot/subscribe` (X-Bot-Key) `{ guildId, discordUserId, on }` → 204

UCI External Events
- GET `/uci/events?q=&from=&to=&limit=&offset=` → cached JSON results

Health
- GET `/health` → `{ data: { ok: true } }`

Error Codes: `INVALID_EMAIL_DOMAIN`, `EVENT_FULL`, `JOIN_CODE_REQUIRED`, `NOT_FOUND`, `UNAUTHORIZED`, `FORBIDDEN`, `RATE_LIMITED`, `VALIDATION_ERROR`.

## Reservation Logic (Transactional)
- Reserve (single transaction):
  1. `SELECT COUNT(*) WHERE event_id=? AND status='confirmed' FOR SHARE`
  2. If `< capacity` → `INSERT ... status='confirmed'`
  3. Else if `waitlist_enabled` → `INSERT ... status='waitlisted'`
  4. Else → `409 EVENT_FULL`
- Cancel (single transaction):
  1. `UPDATE reservation SET status='canceled'`
  2. If waitlist enabled → `SELECT id FROM reservations WHERE event_id=? AND status='waitlisted' ORDER BY created_at ASC LIMIT 1 FOR UPDATE SKIP LOCKED`
  3. If found → `UPDATE ... SET status='confirmed', promoted_at=now()`

## Logging & Error Handling (Centralized)
- Structured JSON logs; fields: `ts`, `level`, `logger`, `msg`, `request_id`, `method`, `path`, `status`, `latency_ms`, `client_ip`, `user_id?`, `event_id?`.
- Middleware assigns `request_id` and logs request/response.
- Central error handlers map exceptions → error envelope and log with context; no bare `except`.

## Dependency Injection & Services
- ServiceContainer exposes typed singletons: `Logger`, `Clock`, `Hasher`, `TokenService`, repositories, `NotificationService`.
- FastAPI dependencies yield request-scoped DB sessions; services inject repositories.
- Optional RQ worker service (Redis) for async notifications; same logging and guards.

## Tooling & Policy Enforcement
- Poetry for deps; Dockerized runtime; Railway hosting.
- Ruff + Mypy strict + Yamllint over `src/` and `tests/`.
- Guard scripts:
  - `typing_guard`: forbid `Any`, `cast`, `type: ignore`.
  - `exceptions_guard`: forbid bare `except` and handlers without re-raise.
  - `logging_guard`: forbid `print` and enforce logger usage.
- Orchestrator `tools/guard.py` runs all guards; `make lint` fails on first violation.

## Makefile Commands
- `make lint`: `ruff check --fix`, `mypy --strict`, YAML linting, guard scripts.
- `make test`: `pytest` with coverage (term + XML), fail under threshold.
- `make check`: runs `lint` and `test`.
- `make start`: `docker compose up -d --build` for db, api, bot (and redis if enabled).
- `make stop`: `docker compose stop`.
- `make clean`: stop, remove volumes/images, rebuild fresh stack.

## Docker & Compose
- `Dockerfile.api`: Poetry install, copy `src/`, run Uvicorn.
- `Dockerfile.bot`: Poetry install, copy `bot/`, run Discord client.
- `docker-compose.yml`:
  - `db` (Postgres 15), `api`, `bot`, optional `redis` and `worker`.
  - `api` env: `DATABASE_URL`, `JWT_SECRET`, `CORS_ORIGIN`, `RATE_LIMIT_*`, `PORT`.
  - `bot` env: `DISCORD_BOT_TOKEN`, `API_URL`, `BOT_KEY`.

## CI (GitHub Actions)
- On PR and push to main:
  - Setup Python + Poetry
  - `poetry install`
  - `make lint`
  - `make test`
  - Optional: build Docker; deploy to Railway on tag.

## Frontend (Static)
- Pages: `index.html` (search + infinite scroll), `event.html?id=...` (RSVP), `map.html` (Leaflet), optional `admin.html`.
- Style: soft pastel, rounded corners (16px), glassmorphism cards, focus rings, responsive.
- Assets: `assets/styles.css`, `js/api.js`, `js/auth.js`, `js/pages/*.js`, `config.json` for API base.

## Search
- Implementation: `ILIKE` over `title`/`description`; filters by `starts_at` range, `type`, `clubId`.
- Indexes: `btree(starts_at)`, `btree(lower(title))`. (FTS later.)

## Security
- CORS: only GH Pages origin.
- Secrets: store only `admin_key_hash` and `join_code_hash`.
- Tokens: HS256 JWTs (30 days) for profile and reservation.
- Rate limiting (slowapi): write 20/min/IP; read 60/min/IP.
- Validation: strict Pydantic models; reject unknown fields.

## Environment Variables
- API: `DATABASE_URL`, `JWT_SECRET`, `CORS_ORIGIN`, `RATE_LIMIT_WRITE`, `RATE_LIMIT_READ`, `PORT=8080`.
- Bot: `DISCORD_BOT_TOKEN`, `API_URL`, `BOT_KEY`.
- Web: `web/config.json` with `API_BASE_URL`.

## Testing
- Unit: reservation logic (confirm/waitlist/cancel/promote), services, repositories (with transactional tests).
- Integration: `/events`, `/reserve`, `/search` via httpx TestClient.
- Coverage: target ≥ 85% lines/branches on `src/ics_connect`.

## Ops
- Logging: JSON; mask secrets; include request IDs.
- Monitoring: `/health`; Railway metrics; alert on 5xx spikes.
- Backups: Railway Postgres snapshots; export before schema changes.

## Success Criteria
- Officers create events in Discord; bot replies with shareable link/QR.
- Students discover events (search/scroll/map) and RSVP (confirmed/waitlist/cancel).
- Organizers view capacity and reservations.
- CI green; guards enforce policy; logs structured; no `Any`/casts/ignores.

## Open Questions
- `/notify`: DM subscribers vs channel-only in v1?
- Is `admin.html` required in v1, or Discord-only admin sufficient?
- Map coordinates: OK to manually seed ICS buildings/rooms in v1?

