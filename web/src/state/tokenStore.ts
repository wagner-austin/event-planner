const AUTH_KEY = 'ics.auth.token';
const RSV_PREFIX = 'ics.resv.';

export function setAuthToken(token: string): void { localStorage.setItem(AUTH_KEY, token); }
export function getAuthToken(): string | null { return localStorage.getItem(AUTH_KEY); }
export function clearAuthToken(): void { localStorage.removeItem(AUTH_KEY); }

export function setReservationToken(eventId: string, token: string): void { localStorage.setItem(RSV_PREFIX + eventId, token); }
export function getReservationToken(eventId: string): string | null { return localStorage.getItem(RSV_PREFIX + eventId); }
export function clearReservationToken(eventId: string): void { localStorage.removeItem(RSV_PREFIX + eventId); }
