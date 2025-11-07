# ICS Connect Frontend Plan (v1)

This document defines the frontend architecture, coding standards, and implementation plan for the ICS Connect web UI. It aligns with the backend design doc and enforces strict typing, consistency, and maintainability to prevent drift and reduce tech debt.

## Principles

- Strict typing and contracts:
  - TypeScript with `strict` mode; no `any`, no casts, no `// @ts-ignore`, no implicit `any`.
  - Wire types mirror backend `src/ics_connect/types.py` exactly; converter functions handle date parsing and view-model adaptation.
  - Single error envelope mapping; throw typed errors only.
- DRY, modular, consistent:
  - Shared utilities for config, HTTP, logging, DOM helpers, and token storage.
  - One `ApiClient` for all network calls; pages never call `fetch` directly.
- Reliability & robustness:
  - Centralized fetch wrapper with timeouts, aborts, error envelope handling, and request ID propagation.
  - Recoverable UX for rate limits (429) and transient failures.
- Accessibility first:
  - Semantic HTML, labeled controls, keyboard navigability, visible focus, and `aria-live` for async status.
- Security:
  - No HTML injection; use `textContent` and attribute setters only.
  - CSP restricting scripts/styles to self; optional Leaflet CDN only on map page.
- Performance:
  - Static, framework‑free pages with minimal JS. Progressive enhancement (core content visible without JS where feasible).

## Stack & Runtime

- Static site (GitHub Pages). No runtime build step needed.
- TypeScript sources in `web/src/`; compiled JS checked into `web/assets/js/`.
- Optional dev bundling with `esbuild` to produce a single module per page; output committed.
- Runtime config from `web/config.json` (fetched early at boot): `{ "API_BASE_URL": string }`.

## Directory Structure

```
web/
  index.html              # Search + list
  event.html              # Event details + RSVP + My reservation
  map.html                # Map view (Stage 3, progressive)
  config.json             # { "API_BASE_URL": "https://.../api/v1" }
  assets/
    css/
      base.css            # Normalize, tokens, typography, utilities
      layout.css          # Grid/flex layouts and responsive helpers
      components.css      # Buttons, inputs, cards, banners, toasts
    js/
      index.js            # Compiled from src/pages/index.ts
      event.js            # Compiled from src/pages/event.ts
      map.js              # Compiled from src/pages/map.ts
  src/
    types.ts              # Wire contracts + app types (no any)
    viewmodels/
      converters.ts       # Wire → view conversions (dates, defaults)
    api/
      http.ts             # fetch wrapper (timeouts, errors, headers)
      ApiClient.ts        # typed API surface
    util/
      config.ts           # load/validate config.json
      logger.ts           # structured logger (requestId-aware)
      dom.ts              # safe DOM helpers (strict selectors)
    state/
      tokenStore.ts       # localStorage for auth + reservation tokens
    pages/
      index.ts            # page controller for index.html
      event.ts            # page controller for event.html
      map.ts              # page controller for map.html
  tsconfig.json
```

## TypeScript Configuration (strict, no exceptions)

Recommended `tsconfig.json` flags:

```json
{
  "compilerOptions": {
    "target": "ES2020",
    "module": "ES2020",
    "moduleResolution": "Bundler",
    "strict": true,
    "noImplicitAny": true,
    "noUncheckedIndexedAccess": true,
    "exactOptionalPropertyTypes": true,
    "useUnknownInCatchVariables": true,
    "noImplicitOverride": true,
    "forceConsistentCasingInFileNames": true,
    "skipLibCheck": false,
    "lib": ["ES2020", "DOM"],
    "outDir": "./web/assets/js",
    "rootDir": "./web/src"
  },
  "include": ["web/src/**/*"]
}
```

Prohibitions: no `any`, no `as` casts, no `// @ts-ignore`, no `// @ts-expect-error` unless accompanied by a tracked task to remove and never in core modules.

## Contracts and Types

Wire contracts mirror `src/ics_connect/types.py`:

- EventPublic: strict fields including `starts_at`/`ends_at` ISO strings.
- CreatedEventResponse, ReserveBody, ReservationOut, ReserveResponse, SearchResult, ProfileBody, ProfileOut, AuthResponse.

App types:

```ts
// web/src/types.ts
export interface EventPublicWire { /* mirrors backend; string dates */ }
export interface EventView { /* parsed dates: Date; safe defaults */ }
export type ReservationStatus = 'confirmed' | 'waitlisted' | 'canceled';
```

Converters (no casts):

```ts
// web/src/viewmodels/converters.ts
export function toEventView(w: EventPublicWire): EventView { /* parse, validate */ }
```

## API Surface

Endpoints (mounted at `/api/v1`):

- Health: `GET /health` → `{ ok: true }`.
- Search: `GET /search?q&start&to&limit&offset` → `SearchResult`.
- Events:
  - `GET /events/{event_id}` → `EventPublic`.
  - `POST /events/{event_id}/reserve` → `ReserveResponse`.
  - `GET /events/{event_id}/mine` (Bearer) → `ReservationOut`.
  - `POST /events/{event_id}/cancel` (Bearer) → `{ status: 'canceled' }`.
- Auth (stateless):
  - `POST /auth/login` → `AuthResponse`.
  - `GET /auth/me` (Bearer) → `ProfileOut`.
- Bot (admin): `POST /bot/events` with `X-Bot-Key` (not exposed in public UI).

Typed API client (`web/src/api/ApiClient.ts`):

```ts
export interface HttpOptions { signal?: AbortSignal; timeoutMs?: number }
export interface ApiErrorDetails { code: string; message: string; status: number; requestId?: string; details?: unknown }
export class ApiError extends Error { /* includes code/status/requestId */ }

export class ApiClient {
  constructor(private readonly baseUrl: string) {}
  health(opts?: HttpOptions): Promise<{ ok: true }>
  search(p: { q?: string; start?: string; to?: string; limit?: number; offset?: number }, opts?: HttpOptions): Promise<SearchResult>
  getEvent(id: string, opts?: HttpOptions): Promise<EventPublicWire>
  login(b: ProfileBody, opts?: HttpOptions): Promise<AuthResponse>
  getMe(token: string, opts?: HttpOptions): Promise<ProfileOut>
  reserve(eventId: string, b: ReserveBody, opts?: HttpOptions): Promise<ReserveResponse>
  getMyReservation(eventId: string, token: string, opts?: HttpOptions): Promise<ReservationOut>
  cancelMyReservation(eventId: string, token: string, opts?: HttpOptions): Promise<{ status: 'canceled' }>
  // Optional (dev only): createEvent(...)
}
```

HTTP wrapper (`web/src/api/http.ts`):

- Adds `Accept: application/json` and `Content-Type: application/json` as needed.
- Applies timeout via `AbortController`.
- Parses JSON strictly; if not JSON, throws `ApiError` with `code='APP_ERROR'`.
- Extracts `X-Request-Id` and includes in `ApiError` and logger context.
- Maps 4xx/5xx with backend envelope `{ error: { code, message, details } }` to `ApiError`.
- Retries: only for network errors and 429 with `Retry-After` (exponential backoff bounded); no retries for non-idempotent POSTs unless explicitly allowed.

## Tokens and Client State

Token store (`web/src/state/tokenStore.ts`):

- Auth token: `localStorage['ics.auth.token']`.
- Reservation tokens per event: `localStorage['ics.resv.{eventId}']`.
- Functions: `setAuthToken`, `getAuthToken`, `clearAuthToken`, `setReservationToken(eventId, t)`, `getReservationToken(eventId)`, `clearReservationToken(eventId)`.
- No global mutable singletons — functions capture and return values; page controllers decide when to persist.

## Pages

### index.html (Search + List)

- Features:
  - Search input, optional date range, limit (page size), and infinite scroll/pagination.
  - Renders event cards with title, club (if available later), time range, location text, tags, and RSVP counts.
  - Links to `event.html?id={eventId}`.
- Implementation:
  - On load, fetch config, instantiate `ApiClient`, parse URL query to initial search params, call `search` with `limit`.
  - Maintain `offset` for pagination; append results; stop when `events.length + offset >= total`.
  - Accessibility: `<form>` with submit triggers search; results region has `aria-live=polite`.

### event.html (Event Details + RSVP + My Reservation)

- Features:
  - Fetch and show event details by `id` (from query param).
  - RSVP form: display name, optional email, optional join code (shown only if `requires_join_code`).
  - On successful RSVP: store reservation token per event; show confirmation with status (`confirmed` vs `waitlisted`).
  - “My reservation” panel: if token present, fetch `/events/{id}/mine`; show status and a Cancel button.
- Implementation:
  - Convert `starts_at`/`ends_at` to `Date`; render with locale formatting.
  - Handle 404 with a friendly message and back link to search.
  - Error states: map `JOIN_CODE_REQUIRED`, `EVENT_FULL`, `INVALID_INPUT`, `RATE_LIMITED` to clear messages.

### map.html (Map View — Stage 3)

- Leaflet + marker clustering when `lat/lon` becomes available. Until then, render a placeholder list or geocode-free static message.
- Load the map script only on this page; keep other pages free of map dependencies.

## CSS Architecture

- Tokenized design: CSS variables for colors, spacing, font sizes, radii; `prefers-color-scheme` support later.
- BEM-ish naming: `.btn`, `.btn--primary`, `.card`, `.card__title`, `.banner`.
- Utilities: `.sr-only`, `.visually-hidden`, `.stack`, `.cluster`, `.grid`.
- Responsive: mobile-first; container max widths; readable line lengths.

## Logging and Error Handling

- Logger (`web/src/util/logger.ts`): `info`, `warn`, `error` with structured payloads `{ msg, requestId?, context }`.
- HTTP wrapper attaches `requestId` from response header `X-Request-Id` to logs and errors.
- Error policy:
  - Decode backend envelope; present user-friendly messages; keep raw `code` for diagnostics.
  - Re-throw with `cause` to preserve stack; page controllers catch and render.

## Config Loading

- `web/src/util/config.ts` fetches `config.json` early. Validates shape: exactly one key `API_BASE_URL` as a non-empty string.
- Fail-fast with typed error if invalid; page controllers display a critical banner.

## Security

- Content Security Policy in each HTML page, e.g.:

  ```html
  <meta http-equiv="Content-Security-Policy" content="default-src 'self'; img-src 'self' data:; style-src 'self'; script-src 'self'; connect-src 'self' https:;"> 
  ```

- No inline event handlers; all scripts as ES modules; no external scripts except on map page (Leaflet) with SRI if used.
- Sanitize: do not inject HTML from API; use text nodes only.

## Testing Strategy

- Unit: pure functions (converters, token store, query param parsing).
- Integration (browser): Playwright or Cypress (optional) against production/staging; verify CORS, auth flows, RSVP lifecycle.
- Manual: use `index.html` locally via `make serve` for ad-hoc checks; prefer automated unit tests and the main pages.

## Drift Prevention

- Single source of contracts in `web/src/types.ts` mirroring backend `src/ics_connect/types.py`.
- Guard task: optional script to compare field names against live OpenAPI (`/openapi.json`) in dev; report mismatches.
- Changes to backend types require updating TS types and converters in the same PR.

## Deployment

- Place built assets under `web/` and push to `main`.
- Enable GitHub Pages serving from `/web` folder.
- Set API to allow CORS from the Pages origin via `ICS_CORS_ORIGIN` or `ICS_CORS_ORIGINS`.

## Next Steps (Execution Plan)

1. Create `web/` structure and commit base HTML/CSS skeletons.
2. Add `tsconfig.json` with strict settings; add TS sources under `web/src/`.
3. Implement `config.ts`, `http.ts`, `ApiClient.ts`, `logger.ts`, `dom.ts`, and `tokenStore.ts`.
4. Build `index.ts` and `event.ts` page controllers; compile to `assets/js`.
5. Wire pages to scripts and verify flows with the live API (respecting CORS).
6. Add `map.html` scaffolding (defer full functionality until `lat/lon` is exposed).
7. Optional: add a small CI job to compile TS and verify no type errors; do not require a bundler in CI.
