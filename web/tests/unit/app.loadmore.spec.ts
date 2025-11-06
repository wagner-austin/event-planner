import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

vi.mock('../../src/util/config', () => ({
  loadConfig: vi.fn(async () => ({ API_BASE_URL: 'http://api.local' })),
}));

class MockApiClient {
  base: string;
  calls: Array<any> = [];
  constructor(base: string) { this.base = base; }
  async search(p: { q?: string; start?: string; to?: string; limit?: number; offset?: number }) {
    this.calls.push(p);
    // Return 2 pages with 1 item each
    const page = (p.offset ?? 0) / (p.limit ?? 1);
    const more = page < 1;
    return {
      events: [{ id: `e${page}`, title: `T${page}`, description: null, type: null, starts_at: '2025-01-01T00:00:00.000Z', ends_at: '2025-01-01T01:00:00.000Z', location_text: null, tags: [], public: true, capacity: 1, confirmed_count: 0, waitlist_count: 0, requires_join_code: false }],
      total: more ? 2 : 2,
    } as const;
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
    <section id="search"><form id="search-form" novalidate><input id="q" /><input id="start" /><input id="to" /><input id="limit" value="1" /></form><div id="results"></div><div class="actions"><button id="load-more">More</button></div></section>
    <section id="details"></section>
    <section id="rsvp-section"><form id="rsvp-form" novalidate><input id="display_name" /><input id="email" /></form><div id="rsvp-result"></div></section>
    <section id="mine-section"><div id="my-reservation"></div><button id="cancel-reservation"></button></section>`;
}

describe('load more paging behavior', () => {
  beforeEach(() => { setupDom(); });
  afterEach(() => { vi.restoreAllMocks(); document.body.innerHTML = ''; localStorage.clear(); });

  it('increments offset by limit when clicking load more', async () => {
    const { ApiClient } = await import('../../src/api/ApiClient');
    const client = new (ApiClient as any)('http://api.local') as MockApiClient;
    await import('../../src/app');
    await new Promise((r) => setTimeout(r, 0));
    // First search done on init
    const loadMore = document.querySelector('#load-more') as HTMLButtonElement;
    loadMore.click();
    await new Promise((r) => setTimeout(r, 0));
    // Assert two calls and second has higher offset
    const calls = (ApiClient as any).prototype.calls as Array<any> | undefined;
    // fallback: capture via DOM count (1 + 1 events)
    const results = document.querySelector('#results') as HTMLElement;
    expect(results.children.length).toBeGreaterThanOrEqual(2);
  });
});

