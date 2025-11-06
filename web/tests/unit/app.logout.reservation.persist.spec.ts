import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

vi.mock('../../src/util/config', () => ({
  loadConfig: vi.fn(async () => ({ API_BASE_URL: 'http://api.local' })),
}));

class MockApiClient {
  base: string;
  constructor(base: string) { this.base = base; }
  async search() { return { events: [{ id: 'e1', title: 'T', description: null, type: null, starts_at: '2025-01-01T00:00:00.000Z', ends_at: '2025-01-01T01:00:00.000Z', location_text: null, tags: [], public: true, capacity: 1, confirmed_count: 0, waitlist_count: 0, requires_join_code: false }], total: 1 }; }
  async getEvent() { return { id: 'e1', title: 'T', description: null, type: null, starts_at: '2025-01-01T00:00:00.000Z', ends_at: '2025-01-01T01:00:00.000Z', location_text: null, tags: [], public: true, capacity: 1, confirmed_count: 0, waitlist_count: 0, requires_join_code: false }; }
  async reserve() { return { reservation: { id: 'r1', event_id: 'e1', display_name: 'A', email: null, status: 'confirmed' as const }, token: 'tok' } as const; }
  async getMyReservation() { return { id: 'r1', event_id: 'e1', display_name: 'A', email: null, status: 'confirmed' as const } as const; }
  async cancelMyReservation() { return { status: 'canceled' as const } as const; }
  async login() { return { profile: { id: 'p', display_name: 'Alice', email: 'alice@uci.edu' }, token: 'utok' } as const; }
  async getMe(_t: string) { return { id: 'p', display_name: 'Alice', email: 'alice@uci.edu' } as const; }
}

vi.mock('../../src/api/ApiClient', () => ({
  ApiClient: MockApiClient,
}));

function setupDom(): void {
  document.body.innerHTML = `
    <section id="error-banner" class="banner banner--error hidden"></section>
    <header class="site-header"><div class="container"><h1 class="site-title"><a href="#hero" class="site-title__link">ICS Connect</a></h1><nav class="nav"><a href="#login" class="nav__link">Sign in with UCI Email</a><span id="auth-chip" class="chip chip--user hidden"><span id="auth-name"></span><button id="logout" class="btn btn--ghost btn--chip" type="button">Sign out</button></span></nav></div></header>
    <section id="login" class="card">
      <form id="login-form" class="form-grid" novalidate>
        <input id="login_display_name" />
        <input id="login_email" />
        <button type="submit">Sign In</button>
      </form>
      <div id="login-result" class="note"></div>
    </section>
    <section id="search"><form id="search-form" novalidate><input id="q" /><input id="start" /><input id="to" /><input id="limit" value="10" /></form><div id="results"></div><button id="load-more"></button></section>
    <section id="details" class="card"><h2 id="event-title"></h2><p id="event-datetime"></p><p id="event-location"></p><p id="event-desc"></p><p id="event-stats"></p></section>
    <section id="rsvp-section"><form id="rsvp-form" novalidate><label for="display_name">Name</label><input id="display_name" /><label for="email">Email</label><input id="email" /><div id="join-code-row" class="hidden"><input id="join_code" /></div><button type="submit">Reserve</button></section>
    <section id="mine-section"><div id="my-reservation"></div><button id="cancel-reservation"></button></section>`;
}

describe('logout clears all reservation tokens and auth state', () => {
  beforeEach(() => { setupDom(); localStorage.clear(); localStorage.setItem('ics.auth.token','utok'); });
  afterEach(() => { vi.restoreAllMocks(); document.body.innerHTML = ''; localStorage.clear(); });

  it('clears reservation tokens on logout and shows no reservation', async () => {
    await import('../../src/app');
    await new Promise((r) => setTimeout(r, 0));
    // open details and reserve
    const link = document.querySelector('#results a') as HTMLAnchorElement | null;
    expect(link).not.toBeNull();
    link!.click();
    await new Promise((r) => setTimeout(r, 0));
    (document.querySelector('#display_name') as HTMLInputElement).value = 'A';
    (document.querySelector('#email') as HTMLInputElement).value = '';
    (document.querySelector('#rsvp-form') as HTMLFormElement).dispatchEvent(new Event('submit'));
    await new Promise((r) => setTimeout(r, 0));
    // verify reservation token was stored
    expect(localStorage.getItem('ics.resv.e1')).toBe('tok');
    // logout
    const lo = document.querySelector('#logout') as HTMLButtonElement | null;
    expect(lo).not.toBeNull();
    lo!.click();
    await new Promise((r) => setTimeout(r, 0));
    // reservation tokens should be cleared
    expect(localStorage.getItem('ics.resv.e1')).toBeNull();
    // auth token should be cleared
    expect(localStorage.getItem('ics.auth.token')).toBeNull();
    // my reservation should show "No reservation yet"
    const my = document.querySelector('#my-reservation') as HTMLElement;
    expect((my.textContent || '').trim()).toBe('No reservation yet.');
  });
});
