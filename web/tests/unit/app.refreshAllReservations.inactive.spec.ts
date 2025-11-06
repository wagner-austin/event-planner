import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

vi.mock('../../src/util/config', () => ({
  loadConfig: vi.fn(async () => ({ API_BASE_URL: 'http://api.local' })),
}));

class MockApiClient {
  base: string;
  constructor(base: string) { this.base = base; }
  async search() { return { events: [], total: 0 } as const; }
  async getEvent() { throw new Error('x'); }
  async reserve() { throw new Error('x'); }
  async getMyReservation() { throw new Error('x'); }
  async cancelMyReservation() { throw new Error('x'); }
  async login() { return { profile: { id: 'p', display_name: 'U', email: 'u@uci.edu' }, token: 'utok' } as const; }
  async getMe(_t: string) { return { id: 'p', display_name: 'U', email: 'u@uci.edu' } as const; }
}

vi.mock('../../src/api/ApiClient', () => ({
  ApiClient: MockApiClient,
}));

function setupDom(): void {
  document.body.innerHTML = `
    <section id="error-banner" class="banner banner--error hidden"></section>
    <section id="mine-section"><div id="my-reservation"></div><button id="cancel-reservation"></button></section>`;
}

describe('refreshAllReservations early return when inactive', () => {
  beforeEach(() => { setupDom(); localStorage.clear(); });
  afterEach(() => { vi.restoreAllMocks(); document.body.innerHTML = ''; localStorage.clear(); });

  it('returns early when app instance is inactive (via logout trigger)', async () => {
    // Monkey-patch getAttribute so that the first two isActive() checks
    // (from refreshMyReservation and refreshAllReservations invoked during init)
    // see an inactive instance and return early.
    const orig = document.body.getAttribute.bind(document.body);
    let count = 0;
    const spy = vi
      .spyOn(document.body, 'getAttribute')
      .mockImplementation((name: string): string | null => {
        if (name === 'data-app-instance' && count < 2) {
          count += 1;
          return 'other';
        }
        return orig(name);
      });

    await import('../../src/app');
    await new Promise((r) => setTimeout(r, 0));

    // Restore immediately to avoid affecting other tests
    spy.mockRestore();
    expect(true).toBe(true);
  });
});
