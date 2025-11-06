import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

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
          confirmed_count: 1, waitlist_count: 0, requires_join_code: false,
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
      confirmed_count: 1, waitlist_count: 0, requires_join_code: false,
    };
  }
  async reserve() { return { reservation: { id: 'r1', event_id: 'e1', display_name: 'A', email: null, status: 'confirmed' as const }, token: 'tok' }; }
  async getMyReservation() { return { id: 'r1', event_id: 'e1', display_name: 'A', email: null, status: 'confirmed' as const }; }
  async cancelMyReservation() { return { status: 'canceled' as const }; }
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
        <form id="search-form" class="form-grid" novalidate>
          <select id="club-filter"><option value="all">All clubs</option><option value="WICS">WICS</option></select>
          <select id="date-filter"><option value="all">All dates</option><option value="week">This week</option><option value="month">This month</option></select>
          <input id="q" name="q" type="search" />
          <input id="start" name="start" />
          <input id="to" name="to" />
          <input id="limit" name="limit" value="10" />
          <button type="submit">Search</button>
        </form>
      </section>
      <section id="results-section"><div id="results"></div><div class="actions"><button id="load-more">More</button></div></section>
      <section id="details"></section>
      <section id="rsvp-section"><form id="rsvp-form" novalidate><input id="display_name" /><input id="email" /><div id="join-code-row" class="hidden"><input id="join_code" /></div></form><div id="rsvp-result"></div></section>
      <section id="mine-section"><div id="my-reservation">No reservation yet.</div><button id="cancel-reservation">Cancel</button></section>
    </main>`;
}

describe('filters behavior', () => {
  beforeEach(() => {
    setupDom();
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2025-02-05T12:00:00.000Z')); // Wed
  });
  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
    document.body.innerHTML = '';
    localStorage.clear();
  });

  it('applies club and date filters into search params', async () => {
    const { ApiClient } = await import('../../src/api/ApiClient');
    const captured: Array<{ q?: string; start?: string; to?: string; limit: number; offset: number }> = [];
    const orig = ApiClient.prototype.search;
    vi.spyOn(ApiClient.prototype, 'search').mockImplementation(async (q) => {
      captured.push(q);
      return await orig.call(new (ApiClient as any)('http://api.local'), q);
    });

    await import('../../src/app');
    await vi.runAllTimersAsync();

    (document.querySelector('#q') as HTMLInputElement).value = 'meet';
    (document.querySelector('#club-filter') as HTMLSelectElement).value = 'WICS';
    (document.querySelector('#date-filter') as HTMLSelectElement).value = 'week';

    (document.querySelector('#search-form') as HTMLFormElement).dispatchEvent(new Event('submit'));
    await vi.runAllTimersAsync();

    // The last captured search should include our filters
    const last = captured[captured.length - 1];
    expect(last.q).toContain('WICS');
    expect(last.q).toContain('meet');
    expect(typeof last.start).toBe('string');
    expect(typeof last.to).toBe('string');
  });

  it('applies month filter (including December rollover) into search params', async () => {
    const { ApiClient } = await import('../../src/api/ApiClient');
    const captured: Array<{ q?: string; start?: string; to?: string; limit: number; offset: number }> = [];
    const orig = ApiClient.prototype.search;
    vi.spyOn(ApiClient.prototype, 'search').mockImplementation(async (q) => {
      captured.push(q);
      return await orig.call(new (ApiClient as any)('http://api.local'), q);
    });

    // December date to exercise month rollover branch
    vi.setSystemTime(new Date('2025-12-15T12:00:00.000Z'));
    await import('../../src/app');
    await vi.runAllTimersAsync();

    (document.querySelector('#q') as HTMLInputElement).value = '';
    (document.querySelector('#club-filter') as HTMLSelectElement).value = 'all';
    (document.querySelector('#date-filter') as HTMLSelectElement).value = 'month';

    (document.querySelector('#search-form') as HTMLFormElement).dispatchEvent(new Event('submit'));
    await vi.runAllTimersAsync();

    const last = captured[captured.length - 1];
    expect(last.q).toBeUndefined();
    expect(typeof last.start).toBe('string');
    expect(typeof last.to).toBe('string');
  });

  it('works without optional filters present and with club-only when q empty', async () => {
    // Remove selects from DOM
    const cf = document.querySelector('#club-filter');
    if (cf && cf.parentElement) cf.parentElement.removeChild(cf);
    const df = document.querySelector('#date-filter');
    if (df && df.parentElement) df.parentElement.removeChild(df);

    const { ApiClient } = await import('../../src/api/ApiClient');
    const captured: Array<{ q?: string; start?: string; to?: string; limit: number; offset: number }> = [];
    const orig = ApiClient.prototype.search;
    vi.spyOn(ApiClient.prototype, 'search').mockImplementation(async (q) => {
      captured.push(q);
      return await orig.call(new (ApiClient as any)('http://api.local'), q);
    });

    await import('../../src/app');
    await vi.runAllTimersAsync();

    (document.querySelector('#q') as HTMLInputElement).value = '';
    // No filters present, ensure no crash and no extra q
    (document.querySelector('#search-form') as HTMLFormElement).dispatchEvent(new Event('submit'));
    await vi.runAllTimersAsync();

    const last = captured[captured.length - 1];
    expect(last.q).toBeUndefined();
  });

  it('applies month filter for non-December months', async () => {
    const { ApiClient } = await import('../../src/api/ApiClient');
    const captured: Array<{ q?: string; start?: string; to?: string; limit: number; offset: number }> = [];
    const orig = ApiClient.prototype.search;
    vi.spyOn(ApiClient.prototype, 'search').mockImplementation(async (q) => {
      captured.push(q);
      return await orig.call(new (ApiClient as any)('http://api.local'), q);
    });

    vi.setSystemTime(new Date('2025-02-05T12:00:00.000Z'));
    await import('../../src/app');
    await vi.runAllTimersAsync();

    (document.querySelector('#date-filter') as HTMLSelectElement).value = 'month';
    (document.querySelector('#search-form') as HTMLFormElement).dispatchEvent(new Event('submit'));
    await vi.runAllTimersAsync();

    const last = captured[captured.length - 1];
    expect(typeof last.start).toBe('string');
    expect(typeof last.to).toBe('string');
  });

  it('club filter populates q when q is empty', async () => {
    const { ApiClient } = await import('../../src/api/ApiClient');
    const captured: Array<{ q?: string; start?: string; to?: string; limit: number; offset: number }> = [];
    const orig = ApiClient.prototype.search;
    vi.spyOn(ApiClient.prototype, 'search').mockImplementation(async (q) => {
      captured.push(q);
      return await orig.call(new (ApiClient as any)('http://api.local'), q);
    });

    await import('../../src/app');
    await vi.runAllTimersAsync();

    (document.querySelector('#q') as HTMLInputElement).value = '';
    (document.querySelector('#club-filter') as HTMLSelectElement).value = 'WICS';
    (document.querySelector('#search-form') as HTMLFormElement).dispatchEvent(new Event('submit'));
    await vi.runAllTimersAsync();

    const last = captured[captured.length - 1];
    expect(last.q).toBe('WICS');
  });
});
