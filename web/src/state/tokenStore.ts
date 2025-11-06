const AUTH_KEY = 'ics.auth.token';
const RSV_PREFIX = 'ics.resv.';
const LAST_EVENT_KEY = 'ics.last.event';

export function setAuthToken(token: string): void { localStorage.setItem(AUTH_KEY, token); }
export function getAuthToken(): string | null { return localStorage.getItem(AUTH_KEY); }
export function clearAuthToken(): void { localStorage.removeItem(AUTH_KEY); }

export function setReservationToken(eventId: string, token: string): void { localStorage.setItem(RSV_PREFIX + eventId, token); }
export function getReservationToken(eventId: string): string | null { return localStorage.getItem(RSV_PREFIX + eventId); }
export function clearReservationToken(eventId: string): void { localStorage.removeItem(RSV_PREFIX + eventId); }
export function clearAllReservationTokens(): void {
  const toRemove: string[] = [];
  for (let i = 0; i < localStorage.length; i++) {
    const k = localStorage.key(i);
    if (typeof k === 'string' && k.startsWith(RSV_PREFIX)) toRemove.push(k);
  }
  for (const k of toRemove) localStorage.removeItem(k);
}

export type ReservationEntry = { eventId: string; token: string };

export function listReservationEntries(): ReadonlyArray<ReservationEntry> {
  const entries: ReservationEntry[] = [];
  for (let i = 0; i < localStorage.length; i++) {
    const k = localStorage.key(i);
    if (typeof k === 'string' && k.startsWith(RSV_PREFIX)) {
      const token = localStorage.getItem(k);
      if (!token) continue;
      const eventId = k.substring(RSV_PREFIX.length);
      if (eventId) entries.push({ eventId, token });
    }
  }
  return entries;
}

export function setLastSelectedEvent(eventId: string): void { localStorage.setItem(LAST_EVENT_KEY, eventId); }
export function getLastSelectedEvent(): string | null { return localStorage.getItem(LAST_EVENT_KEY); }
export function clearLastSelectedEvent(): void { localStorage.removeItem(LAST_EVENT_KEY); }
