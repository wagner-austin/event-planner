import { describe, it, vi, beforeEach, afterEach } from 'vitest';

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

describe('cancel-item guard when closest element is not an HTMLElement', () => {
  beforeEach(() => { setupDom(); localStorage.clear(); });
  afterEach(() => { vi.restoreAllMocks(); document.body.innerHTML = ''; localStorage.clear(); });

  it('returns early when closest() matches an SVG element', async () => {
    await import('../../src/app');
    await new Promise((r) => setTimeout(r, 0));
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('data-action', 'cancel-item');
    const child = document.createElement('span');
    svg.appendChild(child);
    document.body.appendChild(svg);
    child.click();
    await new Promise((r) => setTimeout(r, 0));
  });
});

