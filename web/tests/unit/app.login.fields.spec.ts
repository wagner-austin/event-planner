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
  async login() { return { profile: { id: 'p', display_name: 'Alice', email: 'alice@uci.edu' }, token: 'tok' } as const; }
  async getMe(_t: string) { return { id: 'p', display_name: 'Alice', email: 'alice@uci.edu' } as const; }
}

vi.mock('../../src/api/ApiClient', () => ({
  ApiClient: MockApiClient,
}));

function setupDom(): void {
  document.body.innerHTML = `
    <section id="error-banner" class="banner banner--error hidden"></section>
    <section id="login" class="card">
      <form id="login-form" class="form-grid" novalidate>
        <label for="display_name">Name</label>
        <input id="login_display_name" />
        <label for="email">UCI Email</label>
        <input id="login_email" />
        <button type="submit">Sign In</button>
      </form>
    </section>
    <section id="rsvp-section"><form id="rsvp-form" novalidate>
      <label for="display_name">Name</label><input id="display_name" />
      <label for="email">Email</label><input id="email" />
      <div id="join-code-row" class="hidden"><input id="join_code" /></div>
    </form></section>
    <section id="mine-section"><div id="my-reservation"></div><button id="cancel-reservation"></button></section>`;
}

describe('login hides RSVP fields; logout shows them', () => {
  beforeEach(() => { setupDom(); localStorage.clear(); localStorage.setItem('ics.auth.token', 'tok'); });
  afterEach(() => { vi.restoreAllMocks(); document.body.innerHTML = ''; localStorage.clear(); });

  it('toggles RSVP labels/inputs on login/logout', async () => {
    await import('../../src/app');
    await new Promise((r) => setTimeout(r, 0));
    // On login, fields hidden
    const dnLabel = document.querySelector('label[for="display_name"]') as HTMLElement;
    const dnInput = document.querySelector('#display_name') as HTMLElement;
    const emLabel = document.querySelector('label[for="email"]') as HTMLElement;
    const emInput = document.querySelector('#email') as HTMLElement;
    expect(dnLabel.classList.contains('hidden')).toBe(true);
    expect(dnInput.classList.contains('hidden')).toBe(true);
    expect(emLabel.classList.contains('hidden')).toBe(true);
    expect(emInput.classList.contains('hidden')).toBe(true);
    // Logout
    const lo = document.createElement('button'); lo.id = 'logout'; document.body.appendChild(lo);
    lo.click();
    await new Promise((r) => setTimeout(r, 0));
    expect(dnLabel.classList.contains('hidden')).toBe(false);
    expect(dnInput.classList.contains('hidden')).toBe(false);
    expect(emLabel.classList.contains('hidden')).toBe(false);
    expect(emInput.classList.contains('hidden')).toBe(false);
  });
});
