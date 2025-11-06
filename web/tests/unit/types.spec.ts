import { describe, it, expect } from 'vitest';
import { isEventPublicWire, toEventView } from '../../src/types';

describe('types validators', () => {
  it('accepts valid EventPublicWire and converts to EventView', () => {
    const w = {
      id: '1', title: 'T', description: null, type: null,
      starts_at: '2025-01-01T10:00:00.000Z', ends_at: '2025-01-01T11:00:00.000Z',
      location_text: null, tags: [], public: true, capacity: 10,
      confirmed_count: 0, waitlist_count: 0, requires_join_code: false
    };
    expect(isEventPublicWire(w)).toBe(true);
    const v = toEventView(w);
    expect(v.title).toBe('T');
    expect(v.startsAt instanceof Date).toBe(true);
  });

  it('rejects invalid types', () => {
    expect(isEventPublicWire(42)).toBe(false);
    expect(isEventPublicWire({})).toBe(false);
  });

  it('throws on invalid event dates', () => {
    const bad = {
      id: '1', title: 'T', description: null, type: null,
      starts_at: 'not-a-date', ends_at: 'also-bad',
      location_text: null, tags: [], public: true, capacity: 10,
      confirmed_count: 0, waitlist_count: 0, requires_join_code: false
    };
    expect(() => toEventView(bad)).toThrow();
  });
});
