import { describe, it, expect } from 'vitest';
import { setAuthToken, getAuthToken, clearAuthToken, setReservationToken, getReservationToken, clearReservationToken, clearAllReservationTokens, setLastSelectedEvent, getLastSelectedEvent, clearLastSelectedEvent } from '../../src/state/tokenStore';

describe('token store', () => {
  it('auth token round-trip', () => {
    clearAuthToken();
    expect(getAuthToken()).toBeNull();
    setAuthToken('t');
    expect(getAuthToken()).toBe('t');
    clearAuthToken();
    expect(getAuthToken()).toBeNull();
  });

  it('reservation token per-event', () => {
    clearReservationToken('e1');
    expect(getReservationToken('e1')).toBeNull();
    setReservationToken('e1', 'tok');
    expect(getReservationToken('e1')).toBe('tok');
    clearReservationToken('e1');
    expect(getReservationToken('e1')).toBeNull();
  });

  it('clearAllReservationTokens removes all rsvp keys and preserves auth', () => {
    clearAuthToken();
    clearReservationToken('e1');
    clearReservationToken('e2');
    setAuthToken('auth');
    setReservationToken('e1', 't1');
    setReservationToken('e2', 't2');
    expect(getReservationToken('e1')).toBe('t1');
    expect(getReservationToken('e2')).toBe('t2');
    clearAllReservationTokens();
    expect(getReservationToken('e1')).toBeNull();
    expect(getReservationToken('e2')).toBeNull();
    expect(getAuthToken()).toBe('auth');
  });

  it('last selected event round-trip', () => {
    clearLastSelectedEvent();
    expect(getLastSelectedEvent()).toBeNull();
    setLastSelectedEvent('e1');
    expect(getLastSelectedEvent()).toBe('e1');
    clearLastSelectedEvent();
    expect(getLastSelectedEvent()).toBeNull();
  });
});
