import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

vi.mock('../../src/util/config', () => ({
  loadConfig: vi.fn(async () => ({ API_BASE_URL: 'http://api.local' })),
}));

class MockApiClient {
  base: string;
  constructor(base: string) { this.base = base; }
  async search() { return { events: [], total: 0 }; }
  async getEvent() { throw new Error('no'); }
  async reserve() { throw new Error('no'); }
  async getMyReservation() { throw new Error('no'); }
  async cancelMyReservation() { throw new Error('no'); }
  async login(b: { display_name: string; email: string }) {
    return { profile: { id: 'p1', display_name: b.display_name, email: b.email }, token: 'tok' } as const;
  }
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
    </section>
    <section id="search"><form id="search-form" novalidate><input id="q" /><input id="start" /><input id="to" /><input id="limit" value="10" /></form><div id="results"></div><button id="load-more"></button></section>
    <section id="rsvp-section"><form id="rsvp-form" novalidate><input id="display_name" /><input id="email" /><div id="join-code-row" class="hidden"><input id="join_code" /></div></form><div id="rsvp-result"></div></section>
    <section id="mine-section"><div id="my-reservation"></div><button id="cancel-reservation"></button></section>`;
}

describe('login flow', () => {
  beforeEach(() => {
    setupDom();
    localStorage.clear();
  });
  afterEach(() => {
    vi.restoreAllMocks();
    document.body.innerHTML = '';
    localStorage.clear();
  });

  it('signs in and stores token; updates UI', async () => {
    await import('../../src/app');
    await new Promise((r) => setTimeout(r, 0));
    (document.querySelector('#login_display_name') as HTMLInputElement).value = 'Alice';
    (document.querySelector('#login_email') as HTMLInputElement).value = 'alice@uci.edu';
    (document.querySelector('#login-form') as HTMLFormElement).dispatchEvent(new Event('submit'));
    await new Promise((r) => setTimeout(r, 0));
    expect(localStorage.getItem('ics.auth.token')).toBe('tok');
    expect((document.querySelector('#login-result') as HTMLElement).textContent || '').toContain('Alice');
  });
});

