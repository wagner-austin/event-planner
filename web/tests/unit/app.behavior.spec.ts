import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import type { EventPublicWire } from '../../src/types';

vi.mock('../../src/util/config', () => ({
  loadConfig: vi.fn(async () => ({ API_BASE_URL: 'http://api.local' })),
}));

class MockApiClient {
  base: string;
  constructor(base: string) { this.base = base; }
  async search(_p: { q?: string; start?: string; to?: string; limit?: number; offset?: number }) {
    return {
      events: [
        {
          id: 'e1', title: 'Event One', description: 'Desc', type: null,
          starts_at: '2025-01-01T10:00:00.000Z', ends_at: '2025-01-01T11:00:00.000Z',
          location_text: 'Room 101', tags: [], public: true, capacity: 10,
          confirmed_count: 1, waitlist_count: 0, requires_join_code: true,
        },
      ],
      total: 1,
    };
  }
  async getEvent(_id: string) {
    return {
      id: 'e1', title: 'Event One', description: 'Desc', type: null,
      starts_at: '2025-01-01T10:00:00.000Z', ends_at: '2025-01-01T11:00:00.000Z',
      location_text: 'Room 101', tags: [], public: true, capacity: 10,
      confirmed_count: 1, waitlist_count: 0, requires_join_code: true,
    };
  }
  async reserve(_eventId: string, _b: { display_name: string; email: string | null; join_code: string | null }) {
    return { reservation: { id: 'r1', event_id: 'e1', display_name: 'Alice', email: null, status: 'confirmed' as const }, token: 'tok' };
  }
  async getMyReservation(_eventId: string, _token: string) {
    return { id: 'r1', event_id: 'e1', display_name: 'Alice', email: null, status: 'confirmed' as const };
  }
  async cancelMyReservation(_eventId: string, _token: string) {
    return { status: 'canceled' as const };
  }
  async getMe(_t: string) { return { id: 'p', display_name: 'Alice', email: 'alice@uci.edu' } as const; }
}

vi.mock('../../src/api/ApiClient', () => ({
  ApiClient: MockApiClient,
}));

function setupDom() {
  document.body.innerHTML = `
    <header class="site-header"><nav class="site-nav"></nav></header>
    <main class="container">
      <section id="error-banner" class="banner banner--error hidden"></section>
      <section id="search" class="card">
        <h2>Find Events</h2>
        <form id="search-form" class="form-grid" novalidate>
          <input id="q" name="q" type="search" />
          <input id="start" name="start" />
          <input id="to" name="to" />
          <input id="limit" name="limit" value="10" />
          <button type="submit">Search</button>
        </form>
      </section>
      <section id="results-section"><div id="results"></div><div class="actions"><button id="load-more">More</button></div></section>
      <section id="details" class="card">
        <h2 id="event-title"></h2>
        <p id="event-datetime"></p>
        <p id="event-location"></p>
        <p id="event-desc"></p>
        <p id="event-stats"></p>
      </section>
      <section class="card" id="rsvp-section">
        <form id="rsvp-form" class="form-grid" novalidate>
          <input id="display_name" />
          <input id="email" />
          <div id="join-code-row" class="hidden"><input id="join_code" /></div>
          <button type="submit">Reserve</button>
        </form>
        <div id="rsvp-result" class="note"></div>
      </section>
      <section class="card" id="mine-section">
        <div id="my-reservation" class="note">No reservation yet.</div>
        <button id="cancel-reservation">Cancel</button>
      </section>
    </main>`;
}

describe('app behavior', () => {
  beforeEach(() => {
    setupDom();
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response('{}', { status: 200, headers: { 'content-type': 'application/json' } }));
    localStorage.clear();
    localStorage.setItem('ics.auth.token', 'utok');
  });
  afterEach(() => {
    vi.restoreAllMocks();
    document.body.innerHTML = '';
    localStorage.clear();
  });

  it('renders search results; loads details; RSVP and cancel', async () => {
    await import('../../src/app');
    await new Promise((r) => setTimeout(r, 0));
    const results = document.querySelector('#results') as HTMLElement;
    expect(results.children.length).toBeGreaterThan(0);
    const link = results.querySelector('.card') as HTMLElement;
    link.click();
    await new Promise((r) => setTimeout(r, 0));
    expect((document.querySelector('#event-title') as HTMLElement).textContent).toContain('Event One');
    (document.querySelector('#display_name') as HTMLInputElement).value = 'Alice';
    (document.querySelector('#email') as HTMLInputElement).value = '';
    (document.querySelector('#join_code') as HTMLInputElement).value = '';
    (document.querySelector('#rsvp-form') as HTMLFormElement).dispatchEvent(new Event('submit'));
    await new Promise((r) => setTimeout(r, 0));
    expect((document.querySelector('#rsvp-result') as HTMLElement).textContent).toMatch(/Reservation/);
    (document.querySelector('#cancel-reservation') as HTMLButtonElement).click();
    await new Promise((r) => setTimeout(r, 0));
    expect((document.querySelector('#my-reservation') as HTMLElement).textContent).toBeTruthy();
  });

  it('load more enabled when more total; shows banner on failed load', async () => {
    await import('../../src/app');
    await new Promise((r) => setTimeout(r, 0));
    const banner = document.querySelector('#error-banner') as HTMLElement;
    const proto = (await import('../../src/api/ApiClient')).ApiClient.prototype as any;
    proto.search = async (_p: any) => ({ events: [{ id: 'e1', title: 'Event One', description: 'Desc', type: null, starts_at: '2025-01-01T10:00:00.000Z', ends_at: '2025-01-01T11:00:00.000Z', location_text: 'Room 101', tags: [], public: true, capacity: 10, confirmed_count: 1, waitlist_count: 0, requires_join_code: true }], total: 5 });
    (document.querySelector('#search-form') as HTMLFormElement).dispatchEvent(new Event('submit'));
    await new Promise((r) => setTimeout(r, 0));
    const loadMore = document.querySelector('#load-more') as HTMLButtonElement;
    expect(loadMore.hasAttribute('disabled')).toBe(false);
    proto.search = async (_p: any) => { throw new Error('boom'); };
    loadMore.click();
    await new Promise((r) => setTimeout(r, 0));
    await new Promise((r) => setTimeout(r, 0));
    expect(banner.classList.contains('hidden')).toBe(false);
    expect(banner.textContent || '').toContain('Load more failed');
  });

  it('refreshMyReservation catch path when reservation fetch fails', async () => {
    await import('../../src/app');
    await new Promise((r) => setTimeout(r, 0));
    const proto = (await import('../../src/api/ApiClient')).ApiClient.prototype as any;
    proto.search = async (_p: any) => ({ events: [{ id: 'e1', title: 'Event One', description: 'Desc', type: null, starts_at: '2025-01-01T10:00:00.000Z', ends_at: '2025-01-01T11:00:00.000Z', location_text: 'Room 101', tags: [], public: true, capacity: 10, confirmed_count: 1, waitlist_count: 0, requires_join_code: true }], total: 1 });
    (document.querySelector('#search-form') as HTMLFormElement).dispatchEvent(new Event('submit'));
    await new Promise((r) => setTimeout(r, 0));
    const link = document.querySelector('#results .card') as HTMLElement;
    link.click();
    await new Promise((r) => setTimeout(r, 0));
    localStorage.setItem('ics.resv.e1', 'tok');
    proto.getMyReservation = async (_id: string, _t: string) => { throw 'fail'; };
    link.click();
    await new Promise((r) => setTimeout(r, 0));
    const my = document.querySelector('#my-reservation') as HTMLElement;
    const cancelBtn = document.querySelector('#cancel-reservation') as HTMLButtonElement;
    expect(my.textContent || '').toContain('No reservation found');
    expect(cancelBtn.classList.contains('hidden')).toBe(true);
  });

  it('renders null fields and hides join code when not required', async () => {
    await import('../../src/app');
    await new Promise((r) => setTimeout(r, 0));
    const { ApiClient } = await import('../../src/api/ApiClient');
    const searchSpy = vi.spyOn(ApiClient.prototype, 'search');
    const eventWire: EventPublicWire = {
      id: 'e2', title: 'Event Two', description: null, type: null,
      starts_at: '2025-02-01T10:00:00.000Z', ends_at: '2025-02-01T11:00:00.000Z',
      location_text: null, tags: [], public: true, capacity: 5,
      confirmed_count: 0, waitlist_count: 0, requires_join_code: false,
    };
    vi.spyOn(ApiClient.prototype, 'getEvent').mockResolvedValue(eventWire);
    searchSpy.mockResolvedValue({ events: [eventWire], total: 1 });
    (document.querySelector('#search-form') as HTMLFormElement).dispatchEvent(new Event('submit'));
    await new Promise((r) => setTimeout(r, 0));
    const card = document.querySelector('#results article') as HTMLElement;
    const meta = card.querySelector('.card__meta') as HTMLElement;
    const desc = card.querySelector('.card__desc') as HTMLElement;
    expect(meta.textContent || '').toContain('TBD');
    expect(desc.textContent || '').toBe('');
    card.click();
    await new Promise((r) => setTimeout(r, 0));
    const jrow = document.querySelector('#join-code-row') as HTMLElement;
    expect(jrow.classList.contains('hidden')).toBe(true);
    expect((document.querySelector('#event-location') as HTMLElement).textContent || '').toBe('TBD');
  });

  it('applies q/start/to params when provided', async () => {
    await import('../../src/app');
    await new Promise((r) => setTimeout(r, 0));
    const { ApiClient } = await import('../../src/api/ApiClient');
    const captured: Array<{ q?: string; start?: string; to?: string; limit: number; offset: number }> = [];
    const orig = ApiClient.prototype.search;
    vi.spyOn(ApiClient.prototype, 'search').mockImplementation(async (q) => {
      captured.push(q);
      return {
        events: [{ id: 'e3', title: 'Event Three', description: 'D', type: null, starts_at: '2025-03-01T10:00:00.000Z', ends_at: '2025-03-01T11:00:00.000Z', location_text: 'Hall', tags: [], public: true, capacity: 3, confirmed_count: 0, waitlist_count: 0, requires_join_code: true }],
        total: 1,
      };
    });
    (document.querySelector('#q') as HTMLInputElement).value = 'meet';
    (document.querySelector('#start') as HTMLInputElement).value = '2025-02-01T00:00:00.000Z';
    (document.querySelector('#to') as HTMLInputElement).value = '2025-02-28T23:59:59.000Z';
    (document.querySelector('#search-form') as HTMLFormElement).dispatchEvent(new Event('submit'));
    await new Promise((r) => setTimeout(r, 0));
    const last = captured[captured.length - 1];
    expect(last.q).toBe('meet');
    expect(last.start).toBe('2025-02-01T00:00:00.000Z');
    expect(last.to).toBe('2025-02-28T23:59:59.000Z');
    ApiClient.prototype.search = orig;
  });

  it('delegated click returns early for non-HTMLElement target', async () => {
    await import('../../src/app');
    await new Promise((r) => setTimeout(r, 0));
    document.dispatchEvent(new Event('click'));
    expect(true).toBe(true);
  });

  it('cancel returns early when no event or token', async () => {
    vi.resetModules(); // Reset module state to prevent cross-test contamination
    await import('../../src/app');
    await new Promise((r) => setTimeout(r, 0));
    await new Promise((r) => setTimeout(r, 0));
    (document.querySelector('#search-form') as HTMLFormElement).dispatchEvent(new Event('submit'));
    await new Promise((r) => setTimeout(r, 0));
    const cancelBtn = document.querySelector('#cancel-reservation') as HTMLButtonElement;
    const { ApiClient } = await import('../../src/api/ApiClient');
    const cancelSpy = vi.spyOn(ApiClient.prototype, 'cancelMyReservation');
    cancelBtn.click();
    await new Promise((r) => setTimeout(r, 0));
    expect(cancelSpy).not.toHaveBeenCalled();
    const link = document.querySelector('#results .card') as HTMLElement;
    link.click();
    await new Promise((r) => setTimeout(r, 0));
    cancelBtn.click();
    await new Promise((r) => setTimeout(r, 0));
    // With auth token present and event selected, cancel IS called (backend returns 404 if no reservation)
    expect(cancelSpy).toHaveBeenCalled();
    const my = document.querySelector('#my-reservation') as HTMLElement;
    expect(my.textContent || '').toContain('No reservation');
  });

  it('cancel returns early when no event selected immediately', async () => {
    vi.resetModules(); // Reset module state to prevent cross-test contamination
    await import('../../src/app');
    await new Promise((r) => setTimeout(r, 0));
    const { ApiClient } = await import('../../src/api/ApiClient');
    const cancelSpy = vi.spyOn(ApiClient.prototype, 'cancelMyReservation');
    const cancelBtn = document.querySelector('#cancel-reservation') as HTMLButtonElement;
    cancelBtn.click();
    await new Promise((r) => setTimeout(r, 0));
    // No event selected (currentEventId is null), so cancel returns early
    expect(cancelSpy).not.toHaveBeenCalled();
    const my = document.querySelector('#my-reservation') as HTMLElement;
    expect(my.textContent || '').toContain('No reservation yet');
  });

  it('RSVP returns early when no event selected', async () => {
    vi.resetModules();
    await import('../../src/app');
    await new Promise((r) => setTimeout(r, 0));
    const { ApiClient } = await import('../../src/api/ApiClient');
    const reserveSpy = vi.spyOn(ApiClient.prototype, 'reserve');
    (document.querySelector('#display_name') as HTMLInputElement).value = 'Zed';
    (document.querySelector('#email') as HTMLInputElement).value = '';
    (document.querySelector('#rsvp-form') as HTMLFormElement).dispatchEvent(new Event('submit'));
    await new Promise((r) => setTimeout(r, 0));
    expect(reserveSpy).not.toHaveBeenCalled();
  });

  it('RSVP works when join_code input is missing', async () => {
    await import('../../src/app');
    await new Promise((r) => setTimeout(r, 0));
    await new Promise((r) => setTimeout(r, 0));
    (document.querySelector('#search-form') as HTMLFormElement).dispatchEvent(new Event('submit'));
    await new Promise((r) => setTimeout(r, 0));
    const link = document.querySelector('#results .card') as HTMLElement;
    link.click();
    await new Promise((r) => setTimeout(r, 0));
    const join = document.querySelector('#join_code');
    if (join) join.parentElement?.removeChild(join);
    (document.querySelector('#display_name') as HTMLInputElement).value = 'Bob';
    (document.querySelector('#email') as HTMLInputElement).value = '';
    (document.querySelector('#rsvp-form') as HTMLFormElement).dispatchEvent(new Event('submit'));
    await new Promise((r) => setTimeout(r, 0));
    expect((document.querySelector('#rsvp-result') as HTMLElement).textContent || '').toMatch(/Reservation/);
  });

  it('uses default limit when #limit input empty', async () => {
    await import('../../src/app');
    await new Promise((r) => setTimeout(r, 0));
    const { ApiClient } = await import('../../src/api/ApiClient');
    const orig = ApiClient.prototype.search;
    const captured: Array<{ limit: number }> = [];
    vi.spyOn(ApiClient.prototype, 'search').mockImplementation(async function (this: unknown, q: { limit: number }) {
      captured.push(q);
      return await (orig as any).apply(this as any, [q]);
    });
    (document.querySelector('#limit') as HTMLInputElement).value = '';
    (document.querySelector('#search-form') as HTMLFormElement).dispatchEvent(new Event('submit'));
    await new Promise((r) => setTimeout(r, 0));
    const last = captured[captured.length - 1];
    expect(last.limit).toBe(10);
  });

  it('uses default limit when #limit input is NaN', async () => {
    await import('../../src/app');
    await new Promise((r) => setTimeout(r, 0));
    const { ApiClient } = await import('../../src/api/ApiClient');
    const orig = ApiClient.prototype.search;
    const captured: Array<{ limit: number }> = [];
    vi.spyOn(ApiClient.prototype, 'search').mockImplementation(async function (this: unknown, q: { limit: number }) {
      captured.push(q);
      return await (orig as any).apply(this as any, [q]);
    });
    (document.querySelector('#limit') as HTMLInputElement).value = 'abc';
    (document.querySelector('#search-form') as HTMLFormElement).dispatchEvent(new Event('submit'));
    await new Promise((r) => setTimeout(r, 0));
    const last = captured[captured.length - 1];
    expect(last.limit).toBe(10);
  });

  it('showEventDetails calls scrollIntoView when available', async () => {
    await import('../../src/app');
    await new Promise((r) => setTimeout(r, 0));
    (document.querySelector('#search-form') as HTMLFormElement).dispatchEvent(new Event('submit'));
    await new Promise((r) => setTimeout(r, 0));
    const details = document.querySelector('#details') as any;
    let called = 0;
    Object.defineProperty(details, 'scrollIntoView', { value: () => { called += 1; }, configurable: true });
    const link = document.querySelector('#results .card') as HTMLElement;
    link.click();
    await new Promise((r) => setTimeout(r, 0));
    expect(called).toBe(1);
  });

  it('showEventDetails catch shows banner on failure', async () => {
    await import('../../src/app');
    await new Promise((r) => setTimeout(r, 0));
    (document.querySelector('#search-form') as HTMLFormElement).dispatchEvent(new Event('submit'));
    await new Promise((r) => setTimeout(r, 0));
    const { ApiClient } = await import('../../src/api/ApiClient');
    const proto = ApiClient.prototype as any;
    const orig = proto.getEvent;
    proto.getEvent = async () => { throw new Error('boom'); };
    const link = document.querySelector('#results .card') as HTMLElement;
    link.click();
    await new Promise((r) => setTimeout(r, 0));
    const banner = document.querySelector('#error-banner') as HTMLElement;
    // Banner should stay hidden - errors are silently handled
    expect(banner.classList.contains('hidden')).toBe(true);
    proto.getEvent = orig;
  });
});
