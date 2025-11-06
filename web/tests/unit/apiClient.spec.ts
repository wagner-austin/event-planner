import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { ApiClient } from '../../src/api/ApiClient';

const ok = (body: unknown) => new Response(JSON.stringify(body), { status: 200, headers: { 'content-type': 'application/json' } });

describe('ApiClient', () => {
  let fetchSpy: ReturnType<typeof vi.spyOn>;
  beforeEach(() => { fetchSpy = vi.spyOn(globalThis, 'fetch'); });
  afterEach(() => { fetchSpy.mockRestore(); });

  const base = 'https://api.example/v1';
  const client = new ApiClient(base);

  it('health()', async () => {
    fetchSpy.mockResolvedValue(ok({ ok: true }));
    const h = await client.health();
    expect(h.ok).toBe(true);
  });

  it('search()', async () => {
    fetchSpy.mockImplementation(async (url) => {
      expect(typeof url).toBe('string');
      const s = String(url);
      // No params set case
      expect(s).toContain('/search?');
      return ok({ events: [], total: 0 });
    });
    const res = await client.search({ limit: 10, offset: 0 });
    expect(res.total).toBe(0);
  });

  it('search() sets optional params when provided', async () => {
    fetchSpy.mockImplementation(async (url) => {
      const s = String(url);
      expect(s).toContain('q=hello');
      expect(s).toContain('start=2025-01-01');
      expect(s).toContain('to=2025-02-01');
      expect(s).toContain('limit=5');
      expect(s).toContain('offset=10');
      return ok({ events: [], total: 0 });
    });
    const res = await client.search({ q: 'hello', start: '2025-01-01', to: '2025-02-01', limit: 5, offset: 10 });
    expect(res.total).toBe(0);
  });

  it('getEvent()', async () => {
    fetchSpy.mockResolvedValue(ok({
      id: '1', title: 't', description: null, type: null,
      starts_at: '2025-01-01T00:00:00.000Z', ends_at: '2025-01-01T01:00:00.000Z',
      location_text: null, tags: [], public: true, capacity: 1,
      confirmed_count: 0, waitlist_count: 0, requires_join_code: false,
    }));
    const ev = await client.getEvent('1');
    expect(ev.id).toBe('1');
  });

  it('login() + getMe()', async () => {
    fetchSpy.mockResolvedValueOnce(ok({ profile: { id: 'p1', email: 'e', display_name: 'd' }, token: 't' }));
    const auth = await client.login({ email: 'e', display_name: 'd' });
    expect(auth.token).toBe('t');

    fetchSpy.mockResolvedValueOnce(ok({ id: 'p1', email: 'e', display_name: 'd' }));
    const me = await client.getMe('t');
    expect(me.id).toBe('p1');
  });

  it('reserve() + getMyReservation() + cancelMyReservation()', async () => {
    fetchSpy
      .mockResolvedValueOnce(ok({ reservation: { id: 'r1', event_id: 'e1', display_name: 'a', email: null, status: 'confirmed' }, token: 'reservation-tok' }))
      .mockResolvedValueOnce(ok({ id: 'r1', event_id: 'e1', display_name: 'a', email: null, status: 'confirmed' }))
      .mockResolvedValueOnce(ok({ status: 'canceled' }));

    const res = await client.reserve('e1', { display_name: 'a', email: null, join_code: null });
    expect(res.token).toBe('reservation-tok');
    // getMyReservation and cancelMyReservation now use auth token (not reservation token)
    const authToken = 'auth-tok';
    const r = await client.getMyReservation('e1', authToken);
    expect(r.id).toBe('r1');
    const c = await client.cancelMyReservation('e1', authToken);
    expect(c.status).toBe('canceled');
  });

  it('reserve() sends Authorization header when provided', async () => {
    fetchSpy.mockImplementation(async (_url, init) => {
      const headers = (init as RequestInit | undefined)?.headers as Record<string,string> | undefined;
      expect(headers && headers['Authorization']).toBe('Bearer abc');
      return ok({ reservation: { id: 'r1', event_id: 'e1', display_name: 'a', email: null, status: 'confirmed' }, token: 'tok' });
    });
    const res = await client.reserve('e1', { display_name: 'a', email: null, join_code: null }, 'abc');
    expect(res.token).toBe('tok');
  });

  it('throws on invalid shapes for each method', async () => {
    // health invalid
    fetchSpy.mockResolvedValueOnce(ok({}));
    await expect(client.health()).rejects.toBeInstanceOf(Error);

    // getEvent invalid
    fetchSpy.mockResolvedValueOnce(ok({}));
    await expect(client.getEvent('x')).rejects.toBeInstanceOf(Error);

    // login invalid
    fetchSpy.mockResolvedValueOnce(ok({}));
    await expect(client.login({ email: 'e', display_name: 'd' })).rejects.toBeInstanceOf(Error);

    // getMe invalid
    fetchSpy.mockResolvedValueOnce(ok({}));
    await expect(client.getMe('t')).rejects.toBeInstanceOf(Error);

    // reserve invalid
    fetchSpy.mockResolvedValueOnce(ok({}));
    await expect(client.reserve('e1', { display_name: 'a', email: null, join_code: null })).rejects.toBeInstanceOf(Error);

    // getMyReservation invalid
    fetchSpy.mockResolvedValueOnce(ok({}));
    await expect(client.getMyReservation('e1', 'tok')).rejects.toBeInstanceOf(Error);

    // cancel invalid
    fetchSpy.mockResolvedValueOnce(ok({}));
    await expect(client.cancelMyReservation('e1', 'tok')).rejects.toBeInstanceOf(Error);

    // search invalid
    fetchSpy.mockResolvedValueOnce(ok({}));
    await expect(client.search({ limit: 1, offset: 0 })).rejects.toBeInstanceOf(Error);
  });
});
