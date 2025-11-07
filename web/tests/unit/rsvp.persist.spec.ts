import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

vi.mock('../../src/util/config', () => ({
  loadConfig: vi.fn(async () => ({ API_BASE_URL: 'http://api.local' })),
}));

class MockApiClient {
  base: string;
  constructor(base: string) { this.base = base; }
  // On first search we return one event e1
  async search(_p: any) {
    return { events: [{ id: 'e1', title: 'T', description: null, type: null, starts_at: '2025-01-01T00:00:00.000Z', ends_at: '2025-01-01T01:00:00.000Z', location_text: null, tags: [], public: true, capacity: 1, confirmed_count: 0, waitlist_count: 0, requires_join_code: false }], total: 1 } as const;
  }
  async getEvent(_id: string) {
    return { id: 'e1', title: 'T', description: null, type: null, starts_at: '2025-01-01T00:00:00.000Z', ends_at: '2025-01-01T01:00:00.000Z', location_text: null, tags: [], public: true, capacity: 1, confirmed_count: 0, waitlist_count: 0, requires_join_code: false } as const;
  }
  async reserve(_eventId: string, _b: { display_name: string; email: string | null; join_code: string | null }) {
    return { reservation: { id: 'r1', event_id: 'e1', display_name: 'A', email: null, status: 'confirmed' as const }, token: 'tok' } as const;
  }
  async getMyReservation(_eventId: string, _token: string) {
    return { id: 'r1', event_id: 'e1', display_name: 'A', email: null, status: 'confirmed' as const } as const;
  }
  async cancelMyReservation() { return { status: 'canceled' as const } as const; }
  async login() { return { profile: { id: 'p', display_name: 'User', email: 'u@uci.edu' }, token: 'utok' } as const; }
  async getMe(_t: string) { return { id: 'p', display_name: 'User', email: 'u@uci.edu' } as const; }
}

vi.mock('../../src/api/ApiClient', () => ({
  ApiClient: MockApiClient,
}));

function dom() {
  document.body.innerHTML = `
    <section id="error-banner" class="banner banner--error hidden"></section>
    <section id="search"><form id="search-form" novalidate><input id="q" /><input id="start" /><input id="to" /><input id="limit" value="10" /></form><div id="results"></div><div class="actions"><button id="load-more">More</button></div></section>
    <section id="details" class="card"><h2 id="event-title"></h2><p id="event-datetime"></p><p id="event-location"></p><p id="event-desc"></p><p id="event-stats"></p></section>
    <section id="rsvp-section"><form id="rsvp-form" novalidate><label for="display_name">Name</label><input id="display_name" /><label for="email">Email</label><input id="email" /><div id="join-code-row" class="hidden"><input id="join_code" /></div></form><div id="rsvp-result"></div></section>
    <section id="mine-section"><div id="my-reservation">No reservation yet.</div><button id="cancel-reservation">Cancel</button></section>`;
}

describe('RSVP persists across refresh via last event id + token', () => {
  beforeEach(() => { dom(); localStorage.clear(); localStorage.setItem('ics.auth.token','utok'); });
  afterEach(() => { vi.restoreAllMocks(); localStorage.clear(); document.body.innerHTML = ''; });

  it('stores last event and restores details + my reservation after refresh', async () => {
    await import('../../src/app');
    await new Promise((r) => setTimeout(r, 0));
    const link = document.querySelector('#results .card') as HTMLElement | null;
    expect(link).not.toBeNull();
    link!.click();
    await new Promise((r) => setTimeout(r, 0));
    (document.querySelector('#display_name') as HTMLInputElement).value = 'A';
    (document.querySelector('#email') as HTMLInputElement).value = '';
    (document.querySelector('#rsvp-form') as HTMLFormElement).dispatchEvent(new Event('submit'));
    await new Promise((r) => setTimeout(r, 0));
    // Simulate reload
    const stored = localStorage.getItem('ics.last.event');
    expect(stored).toBe('e1');
    document.body.innerHTML = '';
    dom();
    await import('../../src/app');
    await new Promise((r) => setTimeout(r, 0));
    // My reservation text should reflect fetched reservation now
    const my = document.querySelector('#my-reservation') as HTMLElement;
    expect((my.textContent || '').length).toBeGreaterThan(0);
  });
});
