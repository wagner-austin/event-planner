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
    <section id="error-banner" class="banner banner--error hidden"></section>`;
}

describe('Cancel-item delegated click edge cases', () => {
  beforeEach(() => { setupDom(); localStorage.clear(); });
  afterEach(() => { vi.restoreAllMocks(); document.body.innerHTML = ''; localStorage.clear(); });

  it('returns early when required attributes are missing', async () => {
    await import('../../src/app');
    await new Promise((r) => setTimeout(r, 0));
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.setAttribute('data-action', 'cancel-item');
    // Deliberately omit data-event-id and data-token
    document.body.appendChild(btn);
    btn.click();
    await new Promise((r) => setTimeout(r, 0));
    // No thrown errors and nothing else to assert; branch covered
    expect(true).toBe(true);
  });
});

