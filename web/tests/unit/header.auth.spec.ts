import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

vi.mock('../../src/util/config', () => ({
  loadConfig: vi.fn(async () => ({ API_BASE_URL: 'http://api.local' })),
}));

class MockApiClient {
  base: string;
  constructor(base: string) { this.base = base; }
  async search() { return { events: [], total: 0 }; }
  async getEvent() { throw new Error('x'); }
  async reserve() { throw new Error('x'); }
  async getMyReservation() { throw new Error('x'); }
  async cancelMyReservation() { throw new Error('x'); }
  async login(b: { display_name: string; email: string }) { return { profile: { id: 'p', display_name: b.display_name, email: b.email }, token: 'tok' } as const; }
  async getMe(_t: string) { return { id: 'p', display_name: 'Alice', email: 'alice@uci.edu' } as const; }
}

vi.mock('../../src/api/ApiClient', () => ({
  ApiClient: MockApiClient,
}));

function baseDom() {
  document.body.innerHTML = `
    <section id="error-banner" class="banner banner--error hidden"></section>
    <header class="site-header"><div class="container"><h1 class="site-title"><a href="#hero" class="site-title__link">ICS Connect</a></h1><nav class="nav"><a href="#login" class="nav__link">Sign in with UCI Email</a><span id="auth-chip" class="chip chip--user hidden"><span id="auth-name"></span><button id="logout" class="btn btn--ghost btn--chip" type="button">Sign out</button></span></nav></div></header>
    <section id="login" class="card"><form id="login-form" class="form-grid" novalidate><input id="login_display_name" /><input id="login_email" /><button type="submit">Sign In</button></form><div id="login-result" class="note"></div></section>
    <section id="search"><form id="search-form" novalidate><input id="q" /><input id="start" /><input id="to" /><input id="limit" value="10" /></form><div id="results"></div><button id="load-more"></button></section>
    <section id="rsvp-section"><form id="rsvp-form" novalidate><label for="display_name">Name</label><input id="display_name" /><label for="email">Email</label><input id="email" /><div id="join-code-row" class="hidden"><input id="join_code" /></div></form><div id="rsvp-result"></div></section>
    <section id="mine-section"><div id="my-reservation"></div><button id="cancel-reservation"></button></section>`;
}

describe('header auth chip', () => {
  beforeEach(() => { baseDom(); localStorage.clear(); });
  afterEach(() => { vi.restoreAllMocks(); document.body.innerHTML = ''; localStorage.clear(); });

  it('shows chip and hides nav sign-in when logging in; restores on refresh', async () => {
    vi.resetModules();
    await import('../../src/app');
    await new Promise((r) => setTimeout(r, 0));
    (document.querySelector('#login_display_name') as HTMLInputElement).value = 'Alice';
    (document.querySelector('#login_email') as HTMLInputElement).value = 'alice@uci.edu';
    (document.querySelector('#login-form') as HTMLFormElement).dispatchEvent(new Event('submit'));
    await new Promise((r) => setTimeout(r, 0));
    const chip = document.querySelector('#auth-chip') as HTMLElement;
    expect(chip.classList.contains('hidden')).toBe(false);
    const navLink = document.querySelector('.nav__link') as HTMLElement;
    expect(navLink.classList.contains('hidden')).toBe(true);

    // Simulate refresh: clear body and rebuild DOM with stored token
    const token = localStorage.getItem('ics.auth.token');
    document.body.innerHTML = '';
    baseDom();
    if (token) localStorage.setItem('ics.auth.token', token);
    vi.resetModules();
    await import('../../src/app');
    await new Promise((r) => setTimeout(r, 0));
    const chip2 = document.querySelector('#auth-chip') as HTMLElement;
    expect(chip2.classList.contains('hidden')).toBe(false);
    const nav2 = document.querySelector('.nav__link') as HTMLElement;
    expect(nav2.classList.contains('hidden')).toBe(true);
  });

  it('shows nav link again after logout', async () => {
    localStorage.setItem('ics.auth.token', 'tok');
    await import('../../src/app');
    await new Promise((r) => setTimeout(r, 0));
    (document.querySelector('#logout') as HTMLButtonElement).click();
    await new Promise((r) => setTimeout(r, 0));
    const chip = document.querySelector('#auth-chip') as HTMLElement;
    const navLink = document.querySelector('.nav__link') as HTMLElement;
    expect(chip.classList.contains('hidden')).toBe(true);
    expect(navLink.classList.contains('hidden')).toBe(false);
  });
});
