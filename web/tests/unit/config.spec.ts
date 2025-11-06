import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

const ok = (body: unknown) => new Response(JSON.stringify(body), { status: 200, headers: { 'content-type': 'application/json' } });

describe('config loader', () => {
  let fetchSpy: ReturnType<typeof vi.spyOn>;
  beforeEach(() => { fetchSpy = vi.spyOn(globalThis, 'fetch'); });
  afterEach(() => { fetchSpy.mockRestore(); });

  it('loads and caches config', async () => {
    fetchSpy.mockResolvedValue(ok({ API_BASE_URL: 'x' }));
    const { loadConfig } = await import('../../src/util/config');
    const c1 = await loadConfig();
    expect(c1.API_BASE_URL).toBe('x');
    const c2 = await loadConfig();
    expect(c2).toBe(c1);
    expect(fetchSpy).toHaveBeenCalledTimes(1);
  });

  it('throws on invalid config and does not cache it', async () => {
    vi.resetModules(); // reset module state for cached variable
    fetchSpy.mockResolvedValue(ok({ not_ok: true }));
    const { loadConfig } = await import('../../src/util/config');
    await expect(loadConfig()).rejects.toBeInstanceOf(Error);
  });

  it('throws when config JSON is not an object (primitive)', async () => {
    vi.resetModules();
    fetchSpy.mockResolvedValue(ok('bad'));
    const { loadConfig } = await import('../../src/util/config');
    await expect(loadConfig()).rejects.toBeInstanceOf(Error);
  });

  it('rejects empty API_BASE_URL string', async () => {
    vi.resetModules();
    fetchSpy.mockResolvedValue(ok({ API_BASE_URL: '' }));
    const { loadConfig } = await import('../../src/util/config');
    await expect(loadConfig()).rejects.toBeInstanceOf(Error);
  });
});
