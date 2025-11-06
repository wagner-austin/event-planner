import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { httpJson, ApiError } from '../../src/api/http';

const ok = (body: unknown, headers?: Record<string, string>) =>
  new Response(JSON.stringify(body), { status: 200, headers: { 'content-type': 'application/json', ...(headers || {}) } });

const okText = (text: string, headers?: Record<string, string>) =>
  new Response(text, { status: 200, headers: { 'content-type': 'text/plain', ...(headers || {}) } });

const err = (body: unknown, status = 500, headers?: Record<string, string>) =>
  new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json', ...(headers || {}) } });

const fetchSpy = () => vi.spyOn(globalThis, 'fetch');

describe('httpJson', () => {
  let spy: ReturnType<typeof fetchSpy>;
  beforeEach(() => { spy = fetchSpy(); });
  afterEach(() => { spy.mockRestore(); });

  it('returns parsed JSON and sets headers', async () => {
    spy.mockImplementation(async (_url, init?: RequestInit) => {
      // validate Accept header present
      const headers = new Headers(init?.headers as HeadersInit);
      expect(headers.get('Accept')).toBe('application/json');
      return ok({ ok: true });
    });

    const { data } = await httpJson('GET', 'https://api.example/health');
    expect(data).toEqual({ ok: true });
  });

  it('merges custom headers and sets Content-Type for body', async () => {
    spy.mockImplementation(async (_url, init?: RequestInit) => {
      const headers = new Headers(init?.headers as HeadersInit);
      expect(headers.get('X-Foo')).toBe('bar');
      expect(headers.get('Content-Type')).toBe('application/json');
      return ok({ ok: true });
    });
    const { data } = await httpJson('POST', 'https://api.example/with-body', { a: 1 }, undefined, { 'X-Foo': 'bar' });
    expect(data).toEqual({ ok: true });
  });

  it('parses non-json body as { raw }', async () => {
    spy.mockResolvedValue(okText('hello world'));
    const { data } = await httpJson('GET', 'https://api.example/text');
    expect(data).toEqual({ raw: 'hello world' });
  });

  it('parses missing content-type by attempting JSON parse', async () => {
    spy.mockResolvedValue(new Response('{"ok":true}', { status: 200 }));
    const { data } = await httpJson('GET', 'https://api.example/no-ct');
    expect(data).toEqual({ ok: true });
  });

  it('parses non-json content-type with JSON body by attempting fallback', async () => {
    spy.mockResolvedValue(new Response('{"ok":true}', { status: 200, headers: { 'content-type': 'text/plain' } }));
    const { data } = await httpJson('GET', 'https://api.example/text-json');
    expect(data).toEqual({ ok: true });
  });

  it('handles empty content-type header (fallback to text)', async () => {
    spy.mockResolvedValue(new Response('hello', { status: 200, headers: { 'content-type': '' } }));
    const { data } = await httpJson('GET', 'https://api.example/empty-ct');
    expect(data).toEqual({ raw: 'hello' });
  });

  it('throws ApiError with details on error response', async () => {
    const body = { error: { code: 'BAD', message: 'Nope', details: { why: 'test' } } };
    spy.mockResolvedValue(err(body, 403, { 'X-Request-Id': 'req-1' }));
    let caught: unknown;
    try {
      await httpJson('GET', 'https://api.example/forbidden');
    } catch (e) {
      caught = e;
    }
    expect(caught).toBeInstanceOf(ApiError);
    if (!(caught instanceof ApiError)) throw new Error('expected ApiError');
    expect(caught.code).toBe('BAD');
    expect(caught.status).toBe(403);
    expect(caught.message).toBe('Nope');
    expect(caught.requestId).toBe('req-1');
  });

  it('throws default ApiError when error payload is non-object', async () => {
    spy.mockResolvedValue(new Response('"oops"', { status: 500, headers: { 'content-type': 'application/json' } }));
    let caught: unknown;
    try { await httpJson('GET', 'https://api.example/err-nonobj'); } catch (e) { caught = e; }
    expect(caught).toBeInstanceOf(ApiError);
    if (caught instanceof ApiError) {
      expect(caught.code).toBe('APP_ERROR');
      expect(caught.status).toBe(500);
      expect(caught.message).toBe('HTTP 500');
    }
  });

  it('propagates signal when timeout options present', async () => {
    spy.mockImplementation(async (_url, init?: RequestInit) => {
      // Ensure signal is attached
      expect(init && 'signal' in init && init.signal).toBeTruthy();
      return ok({ ok: true });
    });
    const { data } = await httpJson('GET', 'https://api.example/with-timeout', undefined, { timeoutMs: 50 });
    expect(data).toEqual({ ok: true });
  });

  it('bridges parent AbortSignal to child timeout controller', async () => {
    const parent = new AbortController();
    spy.mockImplementation(async (_url, init?: RequestInit) => {
      // We cannot directly observe the internal listener, but executing this path
      // with a non-undefined parent signal covers the branch.
      expect(init && init.signal).toBeTruthy();
      return ok({ ok: true });
    });
    const { data } = await httpJson('GET', 'https://api.example/with-parent-signal', undefined, { signal: parent.signal, timeoutMs: 10 });
    expect(data).toEqual({ ok: true });
  });

  it('returns parent signal unchanged when no timeout', async () => {
    const parent = new AbortController();
    spy.mockImplementation(async (_url, init?: RequestInit) => {
      expect(init?.signal).toBe(parent.signal);
      return ok({ ok: true });
    });
    const { data } = await httpJson('GET', 'https://api.example/no-timeout', undefined, { signal: parent.signal });
    expect(data).toEqual({ ok: true });
  });

  it('handles error payload not being an object', async () => {
    spy.mockResolvedValue(err({ error: 'oops' }, 500));
    let caught: unknown;
    try { await httpJson('GET', 'https://api.example/error-str'); } catch (e) { caught = e; }
    expect(caught).toBeInstanceOf(ApiError);
  });

  it('executes abort handlers when parent is aborted (with timeout)', async () => {
    const parent = new AbortController();
    let resolveFetch: ((r: Response) => void) | null = null;
    spy.mockImplementation((_url, init?: RequestInit) => new Promise<Response>((resolve) => { resolveFetch = resolve; }));
    const promise = httpJson('GET', 'https://api.example/abort', undefined, { signal: parent.signal, timeoutMs: 25 });
    parent.abort();
    if (resolveFetch) resolveFetch(ok({ ok: true }));
    const { data } = await promise;
    expect(data).toEqual({ ok: true });
  });
});
