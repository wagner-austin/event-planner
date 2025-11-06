import { describe, it, expect } from 'vitest';
import { setAuthToken, getAuthToken, clearAuthToken, setReservationToken, getReservationToken, clearReservationToken } from '../../src/state/tokenStore';

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
});

