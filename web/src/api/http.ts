export interface HttpOptions { signal?: AbortSignal; timeoutMs?: number }

export class ApiError extends Error {
  public readonly code: string;
  public readonly status: number;
  public readonly requestId?: string;
  public readonly details?: unknown;
  constructor(code: string, message: string, status: number, requestId?: string, details?: unknown) {
    super(message);
    this.name = 'ApiError';
    this.code = code;
    this.status = status;
    if (requestId !== undefined) {
      this.requestId = requestId;
    }
    if (details !== undefined) {
      this.details = details;
    }
  }
}

function isRecord(x: unknown): x is Record<string, unknown> { return typeof x === 'object' && x !== null }

function withTimeout(signal: AbortSignal | undefined, timeoutMs: number | undefined): AbortSignal | undefined {
  if (!timeoutMs) return signal;
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeoutMs);
  if (signal) {
    signal.addEventListener('abort', () => ctrl.abort(), { once: true });
  }
  ctrl.signal.addEventListener('abort', () => clearTimeout(timer), { once: true });
  return ctrl.signal;
}

async function parseJsonSafe(resp: Response): Promise<unknown> {
  const ct = resp.headers.get('content-type') || '';
  if (ct.includes('application/json')) {
    return resp.json();
  }
  const text = await resp.text();
  try { return JSON.parse(text); } catch { return { raw: text }; }
}

export async function httpJson(method: 'GET'|'POST'|'PUT'|'PATCH'|'DELETE', url: string, body?: unknown, opts?: HttpOptions, headers?: Record<string,string>): Promise<{ data: unknown, response: Response }>
{
  const init: RequestInit = {
    method,
    headers: { 'Accept': 'application/json', ...(body ? { 'Content-Type': 'application/json' } : {}), ...(headers || {}) },
    body: body ? JSON.stringify(body) : null,
  };
  const signal = withTimeout(opts?.signal, opts?.timeoutMs);
  if (signal) { init.signal = signal; }
  const resp = await fetch(url, init);
  const requestId = resp.headers.get('X-Request-Id') || undefined;
  const data = await parseJsonSafe(resp);
  if (!resp.ok) {
    let code = 'APP_ERROR';
    let message = `HTTP ${resp.status}`;
    let details: unknown = undefined;
    if (isRecord(data) && 'error' in data) {
      const errAny = data['error'];
      if (isRecord(errAny)) {
        const c = errAny['code'];
        const m = errAny['message'];
        if (typeof c === 'string') code = c;
        if (typeof m === 'string') message = m;
        details = errAny['details'];
      }
    }
    throw new ApiError(code, message, resp.status, requestId, details);
  }
  return { data, response: resp };
}

