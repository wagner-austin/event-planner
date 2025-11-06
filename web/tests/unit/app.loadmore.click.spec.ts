import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

vi.mock('../../src/util/config', () => ({
  loadConfig: vi.fn(async () => ({ API_BASE_URL: 'http://api.local' })),
}));

class MockApiClient {
  base: string;
  calls = 0;
  constructor(base: string) { this.base = base; }
  async search() {
    this.calls++;
    return {
      events: [
        { id: 'e1', title: 'T', description: null, type: null, starts_at: '2025-01-01T00:00:00.000Z', ends_at: '2025-01-01T01:00:00.000Z', location_text: null, tags: [], public: true, capacity: 10, confirmed_count: 0, waitlist_count: 0, requires_join_code: false },
      ],
      total: 5,
    } as const;
  }
  async getEvent() { return { id: 'e1', title: 'T', description: null, type: null, starts_at: '2025-01-01T00:00:00.000Z', ends_at: '2025-01-01T01:00:00.000Z', location_text: null, tags: [], public: true, capacity: 10, confirmed_count: 0, waitlist_count: 0, requires_join_code: false } as const; }
  async reserve() { throw new Error('x'); }
  async getMyReservation() { throw new Error('x'); }
  async cancelMyReservation() { return { status: 'canceled' as const } as const; }
  async login() { return { profile: { id: 'p', display_name: 'U', email: 'u@uci.edu' }, token: 'utok' } as const; }
  async getMe(_t: string) { return { id: 'p', display_name: 'U', email: 'u@uci.edu' } as const; }
}

const clientInst = new MockApiClient('');
vi.mock('../../src/api/ApiClient', () => ({
  ApiClient: class extends MockApiClient {
    constructor(b: string) {
      super(b);
      Object.assign(this, clientInst);
      // Ensure calls are tracked on the shared instance used by the test
      // by binding the search method's this to clientInst.
      this.search = this.search.bind(clientInst);
    }
  },
}));

function setupDom(): void {
  document.body.innerHTML = `
    <section id="error-banner" class="banner banner--error hidden"></section>
    <section id="search"><form id="search-form" novalidate><input id="q" /><input id="start" /><input id="to" /><input id="limit" value="10" /></form><div id="results"></div><div class="actions"><button id="load-more">More</button></div></section>`;
}

describe('load more click path', () => {
  beforeEach(() => { setupDom(); localStorage.clear(); clientInst.calls = 0; });
  afterEach(() => { vi.restoreAllMocks(); document.body.innerHTML = ''; localStorage.clear(); });

  it('clicking #load-more triggers additional search and keeps button enabled until total reached', async () => {
    await import('../../src/app');
    await new Promise((r) => setTimeout(r, 0));
    const btn = document.querySelector('#load-more') as HTMLButtonElement;
    expect(btn.hasAttribute('disabled')).toBe(false);
    btn.click();
    await new Promise((r) => setTimeout(r, 0));
    expect(clientInst.calls).toBeGreaterThan(1);
  });
});
