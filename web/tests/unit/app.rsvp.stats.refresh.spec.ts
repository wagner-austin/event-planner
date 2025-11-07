import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

vi.mock('../../src/util/config', () => ({
  loadConfig: vi.fn(async () => ({ API_BASE_URL: 'http://api.local' })),
}));

let reserveCallCount = 0;
let getEventCallCount = 0;
let currentConfirmedCount = 0;

class MockApiClient {
  base: string;
  constructor(base: string) { this.base = base; }

  async search(_p: unknown) {
    return {
      events: [{
        id: 'e1',
        title: 'Test Event',
        description: 'Test',
        type: null,
        starts_at: '2025-01-01T00:00:00.000Z',
        ends_at: '2025-01-01T01:00:00.000Z',
        location_text: 'Test Location',
        tags: [],
        public: true,
        capacity: 10,
        confirmed_count: currentConfirmedCount,
        waitlist_count: 0,
        requires_join_code: false
      }],
      total: 1
    } as const;
  }

  async getEvent(_id: string) {
    getEventCallCount++;
    return {
      id: 'e1',
      title: 'Test Event',
      description: 'Test',
      type: null,
      starts_at: '2025-01-01T00:00:00.000Z',
      ends_at: '2025-01-01T01:00:00.000Z',
      location_text: 'Test Location',
      tags: [],
      public: true,
      capacity: 10,
      confirmed_count: currentConfirmedCount,
      waitlist_count: 0,
      requires_join_code: false
    } as const;
  }

  async reserve(_eventId: string, _b: { display_name: string; email: string | null; join_code: string | null }, _authToken?: string) {
    reserveCallCount++;
    // Simulate backend idempotency: always return same reservation
    // and increment confirmed count only on first call
    if (reserveCallCount === 1) {
      currentConfirmedCount = 1;
    }
    return {
      reservation: {
        id: 'r1',
        event_id: 'e1',
        display_name: 'Test User',
        email: 'test@uci.edu',
        status: 'confirmed' as const
      },
      token: 'resv-tok'
    } as const;
  }

  async getMyReservation(_eventId: string, _token: string) {
    if (currentConfirmedCount === 0) {
      throw new Error('No reservation found');
    }
    return {
      id: 'r1',
      event_id: 'e1',
      display_name: 'Test User',
      email: 'test@uci.edu',
      status: 'confirmed' as const
    } as const;
  }

  async cancelMyReservation() {
    return { status: 'canceled' as const } as const;
  }

  async login() {
    return {
      profile: { id: 'user-1', display_name: 'Test User', email: 'test@uci.edu' },
      token: 'auth-tok'
    } as const;
  }

  async getMe(_t: string) {
    return { id: 'user-1', display_name: 'Test User', email: 'test@uci.edu' } as const;
  }
}

vi.mock('../../src/api/ApiClient', () => ({
  ApiClient: MockApiClient,
}));

function dom(): void {
  document.body.innerHTML = `
    <section id="error-banner" class="banner banner--error hidden"></section>
    <nav><ul><li><a href="#search" class="nav__link">Search</a></li><li><a href="#login" class="nav__link">Login</a></li></ul></nav>
    <section id="auth-section">
      <form id="login-form" novalidate>
        <input id="login_display_name" value="Test User" />
        <input id="login_email" value="test@uci.edu" />
        <button type="submit">Sign in</button>
      </form>
      <div id="login-result"></div>
      <div id="auth-chip" class="hidden"><span id="auth-name"></span><button id="logout">Logout</button></div>
    </section>
    <section id="search">
      <form id="search-form" novalidate>
        <input id="q" />
        <input id="start" />
        <input id="to" />
        <input id="limit" value="10" />
      </form>
      <div id="results"></div>
      <div class="actions"><button id="load-more">More</button></div>
    </section>
    <section id="details" class="card">
      <h2 id="event-title"></h2>
      <p id="event-datetime"></p>
      <p id="event-location"></p>
      <p id="event-desc"></p>
      <p id="event-stats"></p>
      <div id="join-code-row" class="hidden"></div>
    </section>
    <section id="rsvp-section">
      <form id="rsvp-form" novalidate>
        <label for="display_name">Name</label>
        <input id="display_name" value="Test User" />
        <label for="email">Email</label>
        <input id="email" value="test@uci.edu" />
        <div id="join-code-row" class="hidden"><input id="join_code" /></div>
        <button type="submit">Reserve</button>
      </form>
      <div id="rsvp-result"></div>
    </section>
    <section id="mine-section">
      <div id="my-reservation">No reservation yet.</div>
      <button id="cancel-reservation" class="hidden">Cancel</button>
    </section>`;
}

describe('RSVP refreshes event stats', () => {
  beforeEach(() => {
    dom();
    localStorage.clear();
    reserveCallCount = 0;
    getEventCallCount = 0;
    currentConfirmedCount = 0;
  });

  afterEach(() => {
    vi.restoreAllMocks();
    localStorage.clear();
    document.body.innerHTML = '';
  });

  it('refreshes event stats after successful RSVP', async () => {
    // 1. Login first
    localStorage.setItem('ics.auth.token', 'auth-tok');
    await import('../../src/app');
    await new Promise((r) => setTimeout(r, 50));

    // 2. Perform search to populate results
    const searchForm = document.querySelector('#search-form') as HTMLFormElement;
    expect(searchForm).not.toBeNull();
    searchForm.dispatchEvent(new Event('submit'));
    await new Promise((r) => setTimeout(r, 50));

    // 3. Click on an event to view details
    const link = document.querySelector('#results .card') as HTMLElement | null;
    expect(link).not.toBeNull();
    link!.click();
    await new Promise((r) => setTimeout(r, 50));

    // 4. Verify initial stats show 0 attendees
    const statsEl = document.querySelector('#event-stats') as HTMLElement;
    expect(statsEl.textContent).toContain('0/10');

    // Reset getEvent call count (it was called during initial detail view)
    const initialGetEventCalls = getEventCallCount;

    // 5. Submit RSVP
    const rsvpForm = document.querySelector('#rsvp-form') as HTMLFormElement;
    expect(rsvpForm).not.toBeNull();
    rsvpForm.dispatchEvent(new Event('submit'));
    await new Promise((r) => setTimeout(r, 50));

    // 6. Verify getEvent was called again to refresh stats
    expect(getEventCallCount).toBeGreaterThan(initialGetEventCalls);

    // 7. Verify stats now show 1 attendee
    expect(statsEl.textContent).toContain('1/10');

    // 8. Verify reserve was called exactly once
    expect(reserveCallCount).toBe(1);
  });

  it('does not increment stats when clicking reserve multiple times (idempotency)', async () => {
    // 1. Login first
    localStorage.setItem('ics.auth.token', 'auth-tok');
    await import('../../src/app');
    await new Promise((r) => setTimeout(r, 50));

    // 2. Perform search to populate results
    const searchForm = document.querySelector('#search-form') as HTMLFormElement;
    expect(searchForm).not.toBeNull();
    searchForm.dispatchEvent(new Event('submit'));
    await new Promise((r) => setTimeout(r, 50));

    // 3. Click on an event
    const link = document.querySelector('#results .card') as HTMLElement | null;
    expect(link).not.toBeNull();
    link!.click();
    await new Promise((r) => setTimeout(r, 50));

    const statsEl = document.querySelector('#event-stats') as HTMLElement;
    expect(statsEl.textContent).toContain('0/10');

    // 4. Submit RSVP multiple times rapidly
    const rsvpForm = document.querySelector('#rsvp-form') as HTMLFormElement;
    const submitBtn = rsvpForm.querySelector('button[type="submit"]') as HTMLButtonElement;

    rsvpForm.dispatchEvent(new Event('submit'));
    await new Promise((r) => setTimeout(r, 50));

    // Try to click again (should be prevented by button disable logic)
    // But even if it goes through, backend returns same reservation
    rsvpForm.dispatchEvent(new Event('submit'));
    await new Promise((r) => setTimeout(r, 50));

    rsvpForm.dispatchEvent(new Event('submit'));
    await new Promise((r) => setTimeout(r, 50));

    // 5. Stats should still show 1 attendee, not 3
    expect(statsEl.textContent).toContain('1/10');

    // 6. Reserve was called multiple times but backend is idempotent
    expect(reserveCallCount).toBeGreaterThanOrEqual(1);

    // 7. Confirmed count is still 1 (backend idempotency)
    expect(currentConfirmedCount).toBe(1);
  });

  it('shows correct stats when viewing event before and after RSVP', async () => {
    // 1. Login first
    await import('../../src/app');
    await new Promise((r) => setTimeout(r, 50));

    const loginForm = document.querySelector('#login-form') as HTMLFormElement;
    loginForm.dispatchEvent(new Event('submit'));
    await new Promise((r) => setTimeout(r, 50));

    // 2. Perform search to populate results
    const searchForm = document.querySelector('#search-form') as HTMLFormElement;
    expect(searchForm).not.toBeNull();
    searchForm.dispatchEvent(new Event('submit'));
    await new Promise((r) => setTimeout(r, 50));

    // 3. Click on an event to view details
    const link = document.querySelector('#results .card') as HTMLElement;
    link.click();
    await new Promise((r) => setTimeout(r, 50));

    const statsEl = document.querySelector('#event-stats') as HTMLElement;
    const initialText = statsEl.textContent || '';
    expect(initialText).toContain('0/10');

    // 4. Make reservation
    const rsvpForm = document.querySelector('#rsvp-form') as HTMLFormElement;
    rsvpForm.dispatchEvent(new Event('submit'));
    await new Promise((r) => setTimeout(r, 50));

    // 5. Stats should be updated
    const updatedText = statsEl.textContent || '';
    expect(updatedText).toContain('1/10');
    expect(updatedText).not.toBe(initialText);
  });
});
