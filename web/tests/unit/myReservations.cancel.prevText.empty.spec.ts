import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

vi.mock('../../src/util/config', () => ({
  loadConfig: vi.fn(async () => ({ API_BASE_URL: 'http://api.local' })),
}));

class MockApiClient {
  base: string;
  constructor(base: string) { this.base = base; }
  async search() { return { events: [], total: 0 } as const; }
  async getEvent(id: string) { return { id, title: `Event ${id}`, description: null, type: null, starts_at: '2025-01-01T00:00:00.000Z', ends_at: '2025-01-01T01:00:00.000Z', location_text: null, tags: [], public: true, capacity: 10, confirmed_count: 0, waitlist_count: 0, requires_join_code: false } as const; }
  async reserve() { throw new Error('x'); }
  async getMyReservation(eventId: string) { return { id: `r-${eventId}`, event_id: eventId, display_name: 'U', email: 'u@uci.edu', status: 'confirmed' as const } as const; }
  async cancelMyReservation(_eventId: string, _token: string) { return { status: 'canceled' as const } as const; }
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

describe('My Reservations list prevText empty branch', () => {
  beforeEach(() => {
    setupDom();
    localStorage.clear();
    localStorage.setItem('ics.resv.e3', 'tok3');
    localStorage.setItem('ics.auth.token', 'utok'); // Auth token required for cancel
  });
  afterEach(() => { vi.restoreAllMocks(); document.body.innerHTML = ''; localStorage.clear(); });

  it('handles empty textContent for cancel-item button', async () => {
    await import('../../src/app');
    await new Promise((r) => setTimeout(r, 0));
    const btn = document.querySelector('[data-action="cancel-item"]') as HTMLButtonElement | null;
    expect(btn).not.toBeNull();
    // Force empty text to cover `|| ''` fallback branch
    btn!.textContent = '';
    btn!.click();
    await new Promise((r) => setTimeout(r, 0));
    expect(localStorage.getItem('ics.resv.e3')).toBeNull();
  });
});

