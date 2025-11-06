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
  async login() { return { profile: { id: 'p', display_name: 'User', email: 'u@uci.edu' }, token: 'tok' } as const; }
  async getMe(_t: string) { return { id: 'p', display_name: 'User', email: 'u@uci.edu' } as const; }
}

vi.mock('../../src/api/ApiClient', () => ({
  ApiClient: MockApiClient,
}));

function setupDom(): void {
  document.body.innerHTML = `
    <section id="error-banner" class="banner banner--error hidden"></section>
    <section id="login" class="card">
      <form id="login-form" class="form-grid" novalidate>
        <label for="login_display_name">Name</label>
        <input id="login_display_name" />
        <label for="login_email">UCI Email</label>
        <input id="login_email" />
        <button type="submit">Sign In</button>
      </form>
      <div id="login-result" class="note"></div>
    </section>`;
}

describe('login field validation', () => {
  beforeEach(() => { setupDom(); localStorage.clear(); });
  afterEach(() => { vi.restoreAllMocks(); document.body.innerHTML = ''; localStorage.clear(); });

  it('shows name required when empty', async () => {
    const { ApiClient } = await import('../../src/api/ApiClient');
    const spy = vi.spyOn(ApiClient.prototype, 'login');
    await import('../../src/app');
    await new Promise((r) => setTimeout(r, 0));
    (document.querySelector('#login_display_name') as HTMLInputElement).value = '';
    (document.querySelector('#login_email') as HTMLInputElement).value = 'alice@uci.edu';
    (document.querySelector('#login-form') as HTMLFormElement).dispatchEvent(new Event('submit'));
    await new Promise((r) => setTimeout(r, 0));
    const banner = document.querySelector('#error-banner') as HTMLElement;
    expect(banner.classList.contains('hidden')).toBe(false);
    expect((banner.textContent || '')).toContain('Name is required');
    expect(spy).not.toHaveBeenCalled();
  });

  it('shows UCI email required when invalid', async () => {
    const { ApiClient } = await import('../../src/api/ApiClient');
    const spy = vi.spyOn(ApiClient.prototype, 'login');
    await import('../../src/app');
    await new Promise((r) => setTimeout(r, 0));
    (document.querySelector('#login_display_name') as HTMLInputElement).value = 'Alice';
    (document.querySelector('#login_email') as HTMLInputElement).value = 'alice@example.com';
    (document.querySelector('#login-form') as HTMLFormElement).dispatchEvent(new Event('submit'));
    await new Promise((r) => setTimeout(r, 0));
    const banner = document.querySelector('#error-banner') as HTMLElement;
    expect(banner.classList.contains('hidden')).toBe(false);
    expect((banner.textContent || '')).toContain('UCI email');
    expect(spy).not.toHaveBeenCalled();
  });
});

