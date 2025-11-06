import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

vi.mock('../../src/util/config', () => ({
  loadConfig: vi.fn(async () => ({ API_BASE_URL: 'http://api.local' })),
}));

class MockApiClient {
  base: string;
  constructor(base: string) { this.base = base; }
  async search() { return { events: [], total: 0 } as const; }
  async getEvent(id: string) { return { id, title: `Event ${id.toUpperCase()}`, description: null, type: null, starts_at: '2025-01-01T00:00:00.000Z', ends_at: '2025-01-01T01:00:00.000Z', location_text: null, tags: [], public: true, capacity: 10, confirmed_count: 0, waitlist_count: 0, requires_join_code: false } as const; }
  async reserve() { throw new Error('x'); }
  async getMyReservation(eventId: string) { return { id: `r-${eventId}`, event_id: eventId, display_name: 'User', email: 'u@uci.edu', status: 'confirmed' as const } as const; }
  async cancelMyReservation(_eventId: string, _token: string) { return { status: 'canceled' as const } as const; }
  async login() { return { profile: { id: 'p', display_name: 'User', email: 'u@uci.edu' }, token: 'utok' } as const; }
  async getMe(_t: string) { return { id: 'p', display_name: 'User', email: 'u@uci.edu' } as const; }
}

vi.mock('../../src/api/ApiClient', () => ({
  ApiClient: MockApiClient,
}));

function setupDom(): void {
  document.body.innerHTML = `
    <section id="error-banner" class="banner banner--error hidden"></section>
    <section id="mine-section"><div id="my-reservation"></div><button id="cancel-reservation"></button></section>`;
}

describe('My Reservations list cancel button', () => {
  beforeEach(() => {
    setupDom();
    localStorage.clear();
    localStorage.setItem('ics.resv.e1', 't1');
    localStorage.setItem('ics.resv.e2', 't2');
    localStorage.setItem('ics.auth.token', 'utok'); // Auth token required for cancel
  });
  afterEach(() => { vi.restoreAllMocks(); document.body.innerHTML = ''; localStorage.clear(); });

  it('renders entries and cancels one from list', async () => {
    await import('../../src/app');
    await new Promise((r) => setTimeout(r, 0));
    const list = document.querySelector('#my-reservation ul') as HTMLUListElement | null;
    expect(list).not.toBeNull();
    const buttons = Array.from(document.querySelectorAll<HTMLButtonElement>('[data-action="cancel-item"]'));
    expect(buttons.length).toBe(2);
    // Click cancel for e1
    const btnE1 = buttons.find(b => b.getAttribute('data-event-id') === 'e1')!;
    // Click a child element to cover the closest() branch
    const child = document.createElement('span');
    btnE1.appendChild(child);
    child.click();
    await new Promise((r) => setTimeout(r, 0));
    expect(localStorage.getItem('ics.resv.e1')).toBeNull();
    let buttonsAfter = Array.from(document.querySelectorAll<HTMLButtonElement>('[data-action="cancel-item"]'));
    expect(buttonsAfter.length).toBe(1);
    // Click the remaining button itself to cover the direct dataset.action branch
    const btnDirect = buttonsAfter[0];
    btnDirect.click();
    await new Promise((r) => setTimeout(r, 0));
    expect(localStorage.getItem('ics.resv.e2')).toBeNull();
    buttonsAfter = Array.from(document.querySelectorAll<HTMLButtonElement>('[data-action="cancel-item"]'));
    expect(buttonsAfter.length).toBe(0);
  });
});
