import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

vi.mock('../../src/util/config', () => ({
  loadConfig: vi.fn(async () => ({ API_BASE_URL: 'http://api.local' })),
}));

class MockApiClient {
  base: string;
  constructor(base: string) { this.base = base; }
  async search() {
    return { events: [
      { id: 'e1', title: 'T', description: null, type: null, starts_at: '2025-01-01T00:00:00.000Z', ends_at: '2025-01-01T01:00:00.000Z', location_text: null, tags: [], public: true, capacity: 10, confirmed_count: 0, waitlist_count: 0, requires_join_code: false },
    ], total: 1 } as const;
  }
  async getEvent(_id: string) {
    return { id: 'e1', title: 'T', description: null, type: null, starts_at: '2025-01-01T00:00:00.000Z', ends_at: '2025-01-01T01:00:00.000Z', location_text: null, tags: [], public: true, capacity: 10, confirmed_count: 0, waitlist_count: 0, requires_join_code: false } as const;
  }
  async reserve() { throw new Error('x'); }
  async getMyReservation() { return { id: 'r1', event_id: 'e1', display_name: 'U', email: 'u@uci.edu', status: 'confirmed' as const } as const; }
  async cancelMyReservation() { return { status: 'canceled' as const } as const; }
  async login() { return { profile: { id: 'p', display_name: 'U', email: 'u@uci.edu' }, token: 'utok' } as const; }
  async getMe(_t: string) { return { id: 'p', display_name: 'U', email: 'u@uci.edu' } as const; }
}

vi.mock('../../src/api/ApiClient', () => ({
  ApiClient: MockApiClient,
}));

function setupDom(): void {
  document.body.innerHTML = `
    <section id="error-banner" class="banner banner--error hidden"></section>
    <section id="search"><form id="search-form" novalidate><input id="q" /><input id="start" /><input id="to" /><input id="limit" value="10" /></form><div id="results"></div><div class="actions"><button id="load-more">More</button></div></section>
    <section id="details" class="card"><h2 id="event-title"></h2><p id="event-datetime"></p><p id="event-location"></p><p id="event-desc"></p><p id="event-stats"></p></section>
    <section id="rsvp-section"><form id="rsvp-form" novalidate><label for="display_name">Name</label><input id="display_name" /><label for="email">Email</label><input id="email" /><div id="join-code-row" class="hidden"><input id="join_code" /></div><button type="submit" id="rsvp-submit">Reserve</button></form><div id="rsvp-result"></div></section>
    <section id="mine-section"><div id="my-reservation">No reservation yet.</div><button id="cancel-reservation"></button></section>`;
}

describe('#cancel-reservation previous text fallback', () => {
  beforeEach(() => {
    setupDom();
    localStorage.clear();
    localStorage.setItem('ics.resv.e1', 'tok1');
    localStorage.setItem('ics.auth.token', 'utok'); // Auth token required for cancel
  });
  afterEach(() => { vi.restoreAllMocks(); localStorage.clear(); document.body.innerHTML = ''; });

  it('handles empty previous text when canceling current reservation', async () => {
    await import('../../src/app');
    await new Promise((r) => setTimeout(r, 0));
    // Open event details to set currentEventId
    const link = document.querySelector('#results .card') as HTMLElement | null;
    expect(link).not.toBeNull();
    link!.click();
    await new Promise((r) => setTimeout(r, 0));
    const cancelBtn = document.querySelector('#cancel-reservation') as HTMLButtonElement;
    // Ensure empty textContent branch for prev
    cancelBtn.textContent = '';
    cancelBtn.click();
    await new Promise((r) => setTimeout(r, 0));
    expect(localStorage.getItem('ics.resv.e1')).toBeNull();
  });
});

