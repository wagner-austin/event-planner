import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { setReservationToken, clearAllReservationTokens, listReservationEntries, setAuthToken, getReservationToken } from '../../src/state/tokenStore';

describe('tokenStore listReservationEntries', () => {
  beforeEach(() => { localStorage.clear(); });
  afterEach(() => { localStorage.clear(); });

  it('returns all reservation entries with eventId and token', () => {
    setAuthToken('auth');
    setReservationToken('e1', 't1');
    setReservationToken('e2', 't2');
    const entries = listReservationEntries();
    const map = new Map(entries.map(e => [e.eventId, e.token]));
    expect(map.get('e1')).toBe('t1');
    expect(map.get('e2')).toBe('t2');
  });

  it('ignores non-reservation keys and clears correctly', () => {
    setAuthToken('auth');
    setReservationToken('e1', 't1');
    // Simulate a corrupt/missing token entry (empty string)
    localStorage.setItem('ics.resv.eX', '');
    const before = listReservationEntries();
    // eX should be ignored due to empty token value
    expect(before.length).toBe(1);
    clearAllReservationTokens();
    const after = listReservationEntries();
    expect(after.length).toBe(0);
    expect(getReservationToken('e1')).toBeNull();
  });
});
