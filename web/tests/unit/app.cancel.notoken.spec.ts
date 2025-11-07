import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

vi.mock('../../src/util/config', () => ({
  loadConfig: vi.fn(async () => ({ API_BASE_URL: 'http://api.local' })),
}));

const cancelSpy = vi.fn();

class MockApiClient {
  base: string;
  constructor(base: string) { this.base = base; }
  async search() { return { events: [
    { id: 'e1', title: 'T', description: null, type: null, starts_at: '2025-01-01T00:00:00.000Z', ends_at: '2025-01-01T01:00:00.000Z', location_text: null, tags: [], public: true, capacity: 10, confirmed_count: 0, waitlist_count: 0, requires_join_code: false },
  ], total: 1 } as const; }
  async getEvent(_id: string) { return { id: 'e1', title: 'T', description: null, type: null, starts_at: '2025-01-01T00:00:00.000Z', ends_at: '2025-01-01T01:00:00.000Z', location_text: null, tags: [], public: true, capacity: 10, confirmed_count: 0, waitlist_count: 0, requires_join_code: false } as const; }
  async reserve() { throw new Error('x'); }
  async getMyReservation() { throw new Error('x'); }
  async cancelMyReservation() { cancelSpy(); return { status: 'canceled' as const } as const; }
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
    <section id="mine-section"><div id="my-reservation">No reservation yet.</div><button id="cancel-reservation">Cancel</button></section>`;
}

describe('Cancel without token', () => {
  beforeEach(() => { setupDom(); localStorage.clear(); cancelSpy.mockReset(); });
  afterEach(() => { vi.restoreAllMocks(); localStorage.clear(); document.body.innerHTML = ''; });

  it('does not call cancel API and resets UI when token missing', async () => {
    await import('../../src/app');
    await new Promise((r) => setTimeout(r, 0));
    // Open event to set currentEventId
    (document.querySelector('#results .card') as HTMLElement).click();
    await new Promise((r) => setTimeout(r, 0));
    // No reservation token present for e1
    const btn = document.querySelector('#cancel-reservation') as HTMLButtonElement;
    btn.click();
    await new Promise((r) => setTimeout(r, 0));
    // UI reset invoked; cancel API not called
    const my = document.querySelector('#my-reservation') as HTMLElement;
    expect((my.textContent || '')).toContain('No reservation yet.');
    expect(cancelSpy).not.toHaveBeenCalled();
  });
});

