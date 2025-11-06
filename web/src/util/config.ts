export interface AppConfig { API_BASE_URL: string }

let cached: AppConfig | null = null;

function isRecord(x: unknown): x is Record<string, unknown> { return typeof x === 'object' && x !== null }

function isConfig(x: unknown): x is AppConfig {
  if (!isRecord(x)) return false;
  const v = x['API_BASE_URL'];
  return typeof v === 'string' && v.length > 0;
}

export async function loadConfig(): Promise<AppConfig> {
  if (cached) return cached;
  const resp = await fetch('config.json', { headers: { 'Accept': 'application/json' } });
  const data = await resp.json();
  if (!isConfig(data)) throw new Error('Invalid config.json');
  cached = data;
  return data;
}

