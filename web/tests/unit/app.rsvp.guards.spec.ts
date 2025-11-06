import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

vi.mock('../../src/util/config', () => ({
  loadConfig: vi.fn(async () => ({ API_BASE_URL: 'http://api.local' })),
}));

const reserveSpy = vi.fn();

class MockApiClient {
  base: string;
  constructor(base: string) { this.base = base; }
  async search() { return { events: [], total: 0 } as const; }
  async getEvent() { throw new Error('x'); }
  async reserve() { reserveSpy(); return { reservation: { id: 'r', event_id: 'e', display_name: 'U', email: 'u@uci.edu', status: 'confirmed' as const }, token: 'tok' } as const; }
  async getMyReservation() { throw new Error('x'); }
  async cancelMyReservation() { return { status: 'canceled' as const } as const; }
  async login() { return { profile: { id: 'p', display_name: 'U', email: 'u@uci.edu' }, token: 'utok' } as const; }
  async getMe(_t: string) { return { id: 'p', display_name: 'U', email: 'u@uci.edu' } as const; }
}

vi.mock('../../src/api/ApiClient', () => ({
  ApiClient: MockApiClient,
}));

function setupDom(): void {
  document.body.innerHTML = `
    <section id="error-banner" class="banner banner--error hidden"></section>
    <section id="search"><form id="search-form" novalidate><input id="q" /><input id="start" /><input id="to" /><input id="limit" value="10" /></form><div id="results"></div><div class="actions"><button id="load-more">More</button></div></section>
    <section id="rsvp-section"><form id="rsvp-form" novalidate><label for="display_name">Name</label><input id="display_name" /><label for="email">Email</label><input id="email" /><div id="join-code-row" class="hidden"><input id="join_code" /></div><button type="submit">Reserve</button></form><div id="rsvp-result"></div></section>
    <section id="mine-section"><div id="my-reservation"></div><button id="cancel-reservation"></button></section>`;
}

describe('RSVP guards', () => {
  beforeEach(() => { setupDom(); localStorage.clear(); reserveSpy.mockReset(); });
  afterEach(() => { vi.restoreAllMocks(); document.body.innerHTML = ''; localStorage.clear(); });

  it('shows sign-in banner when not authenticated', async () => {
    await import('../../src/app');
    await new Promise((r) => setTimeout(r, 0));
    (document.querySelector('#display_name') as HTMLInputElement).value = 'U';
    (document.querySelector('#rsvp-form') as HTMLFormElement).dispatchEvent(new Event('submit'));
    await new Promise((r) => setTimeout(r, 0));
    const banner = document.querySelector('#error-banner') as HTMLElement;
    expect(banner.classList.contains('hidden')).toBe(false);
    expect((banner.textContent || '')).toContain('sign in');
    expect(reserveSpy).not.toHaveBeenCalled();
  });

  it('does not call reserve when no current event is selected (even if authed)', async () => {
    localStorage.setItem('ics.auth.token', 'utok');
    await import('../../src/app');
    await new Promise((r) => setTimeout(r, 0));
    (document.querySelector('#display_name') as HTMLInputElement).value = 'U';
    (document.querySelector('#email') as HTMLInputElement).value = 'u@uci.edu';
    (document.querySelector('#rsvp-form') as HTMLFormElement).dispatchEvent(new Event('submit'));
    await new Promise((r) => setTimeout(r, 0));
    expect(reserveSpy).not.toHaveBeenCalled();
  });
});

