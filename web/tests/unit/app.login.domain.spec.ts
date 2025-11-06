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
  async login() { return { profile: { id: 'p', display_name: 'User', email: 'user@uci.edu' }, token: 'tok' } as const; }
  async getMe(_t: string) { return { id: 'p', display_name: 'User', email: 'user@uci.edu' } as const; }
}

vi.mock('../../src/api/ApiClient', () => ({
  ApiClient: MockApiClient,
}));

function setupDom(): void {
  document.body.innerHTML = `
    <section id="error-banner" class="banner banner--error hidden"></section>
    <section id="login" class="card">
      <form id="login-form" class="form-grid" novalidate>
        <input id="login_display_name" />
        <input id="login_email" />
        <button type="submit">Sign In</button>
      </form>
      <div id="login-result" class="note"></div>
    </section>`;
}

describe('login domain validation', () => {
  beforeEach(() => { setupDom(); localStorage.clear(); });
  afterEach(() => { vi.restoreAllMocks(); document.body.innerHTML = ''; localStorage.clear(); });

  it('shows banner when non-UCI email used', async () => {
    await import('../../src/app');
    await new Promise((r) => setTimeout(r, 0));
    (document.querySelector('#login_display_name') as HTMLInputElement).value = 'User';
    (document.querySelector('#login_email') as HTMLInputElement).value = 'user@example.com';
    (document.querySelector('#login-form') as HTMLFormElement).dispatchEvent(new Event('submit'));
    await new Promise((r) => setTimeout(r, 0));
    const banner = document.querySelector('#error-banner') as HTMLElement;
    expect(banner.classList.contains('hidden')).toBe(false);
    expect((banner.textContent || '')).toContain('@uci.edu');
  });
});

