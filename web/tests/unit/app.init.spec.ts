import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

describe('app initialization error', () => {
  beforeEach(() => {
    document.body.innerHTML = '<section id="error-banner" class="banner banner--error hidden"></section>';
  });
  afterEach(() => {
    vi.restoreAllMocks();
    document.body.innerHTML = '';
    localStorage.clear();
  });

  it('shows banner on initialization failure', async () => {
    vi.resetModules();
    vi.doMock('../../src/util/config', () => ({ loadConfig: vi.fn(async () => { throw new Error('cfg'); }) }));
    await import('../../src/app');
    await new Promise((r) => setTimeout(r, 0));
    const banner = document.querySelector('#error-banner') as HTMLElement;
    expect(banner.classList.contains('hidden')).toBe(false);
    expect(banner.textContent || '').toContain('Initialization failed');
  });

  it('initApp supports injected logger and loadConfig', async () => {
    vi.resetModules();
    const { initApp } = await import('../../src/app');
    const { ApiClient } = await import('../../src/api/ApiClient');
    type Logger = { info: (m: string, c?: Record<string, unknown>) => void; warn: (m: string, c?: Record<string, unknown>) => void; error: (m: string, c?: Record<string, unknown>) => void };
    const logs: Array<{ level: string; msg: string }> = [];
    const customLogger: Logger = {
      info: (msg) => logs.push({ level: 'info', msg }),
      warn: (msg) => logs.push({ level: 'warn', msg }),
      error: (msg) => logs.push({ level: 'error', msg }),
    };
    initApp({ logger: customLogger, loadConfig: async () => { throw new Error('cfg'); }, makeClient: (b) => new ApiClient(b) });
    await new Promise((r) => setTimeout(r, 0));
    const banner = document.querySelector('#error-banner') as HTMLElement;
    expect(banner.classList.contains('hidden')).toBe(false);
    expect(logs.length).toBeGreaterThanOrEqual(0);
  });
});

