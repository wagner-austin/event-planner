import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

vi.mock('../../src/util/config', () => ({
  loadConfig: vi.fn(async () => ({ API_BASE_URL: 'http://api.local' })),
}));

class MockApiClient {
  base: string;
  calls: number = 0;
  constructor(base: string) { this.base = base; }
  async search(_p: { q?: string; start?: string; to?: string; limit?: number; offset?: number }) {
    this.calls++;
    return { events: [], total: 0 } as const;
  }
  async getEvent() { throw new Error('x'); }
  async reserve() { throw new Error('x'); }
  async getMyReservation() { throw new Error('x'); }
  async cancelMyReservation() { throw new Error('x'); }
}

vi.mock('../../src/api/ApiClient', () => ({
  ApiClient: MockApiClient,
}));

function setupDom() {
  document.body.innerHTML = `
    <section id="error-banner" class="banner banner--error hidden"></section>
    <section id="search" class="card">
      <form id="search-form" class="form-grid" novalidate>
        <select id="club-filter"><option value="all">All clubs</option><option value="ICSSC">ICSSC</option></select>
        <select id="date-filter"><option value="all">All dates</option><option value="week">This week</option></select>
        <input id="q" />
        <input id="start" />
        <input id="to" />
        <input id="limit" value="10" />
      </form>
    </section>
    <section id="results-section"><div id="results"></div><div class="actions"><button id="load-more">More</button></div></section>
    <section id="details"></section>
    <section id="rsvp-section"><form id="rsvp-form" novalidate><input id="display_name" /><input id="email" /></form><div id="rsvp-result"></div></section>
    <section id="mine-section"><div id="my-reservation"></div><button id="cancel-reservation"></button></section>`;
}

describe('filter change triggers search', () => {
  beforeEach(() => { setupDom(); });
  afterEach(() => { vi.restoreAllMocks(); document.body.innerHTML = ''; });

  it('fires search when club/date change', async () => {
    const { ApiClient } = await import('../../src/api/ApiClient');
    let calls = 0;
    const orig = ApiClient.prototype.search;
    vi.spyOn(ApiClient.prototype, 'search').mockImplementation(async function(p) {
      calls += 1;
      // @ts-expect-error this refers to ApiClient instance
      return await orig.call(this, p);
    });
    await import('../../src/app');
    await new Promise((r) => setTimeout(r, 0));
    const baseline = calls; // includes initial search on init
    (document.querySelector('#club-filter') as HTMLSelectElement).value = 'ICSSC';
    (document.querySelector('#club-filter') as HTMLSelectElement).dispatchEvent(new Event('change'));
    await new Promise((r) => setTimeout(r, 0));
    (document.querySelector('#date-filter') as HTMLSelectElement).value = 'week';
    (document.querySelector('#date-filter') as HTMLSelectElement).dispatchEvent(new Event('change'));
    await new Promise((r) => setTimeout(r, 0));
    expect(calls).toBeGreaterThan(baseline);
  });
});
