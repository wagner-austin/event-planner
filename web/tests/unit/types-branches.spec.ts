import { describe, it, expect } from 'vitest';
import {
  isOkResponse,
  isProfileOut,
  isAuthResponse,
  isReservationOut,
  isReserveResponse,
  isSearchResultWire,
  isEventPublicWire,
} from '../../src/types';

describe('type guard branch coverage', () => {
  it('isOkResponse true and false on ok prop', () => {
    expect(isOkResponse({ ok: true })).toBe(true);
    expect(isOkResponse({ ok: false })).toBe(false);
  });

  it('isProfileOut short-circuit cases', () => {
    // Not an object
    expect(isProfileOut(42)).toBe(false);
    // Missing id
    expect(isProfileOut({ email: 'e', display_name: 'n' })).toBe(false);
    // id ok, email bad
    expect(isProfileOut({ id: 'i', email: 1, display_name: 'n' })).toBe(false);
    // id/email ok, name bad
    expect(isProfileOut({ id: 'i', email: 'e', display_name: 1 })).toBe(false);
    // all ok
    expect(isProfileOut({ id: 'i', email: 'e', display_name: 'n' })).toBe(true);
  });

  it('isAuthResponse non-object and missing props', () => {
    expect(isAuthResponse(42)).toBe(false);
    expect(isAuthResponse({})).toBe(false);
  });

  it('isReservationOut non-object and missing status', () => {
    expect(isReservationOut(42)).toBe(false);
    expect(isReservationOut({ id: 'r', event_id: 'e', display_name: 'n', email: null })).toBe(false);
  });

  it('isReservationOut missing event_id and display_name', () => {
    expect(isReservationOut({ id: 'r', display_name: 'n', email: null, status: 'confirmed' })).toBe(false);
    expect(isReservationOut({ id: 'r', event_id: 'e', email: null, status: 'confirmed' })).toBe(false);
  });

  it('isReserveResponse non-object and partials', () => {
    expect(isReserveResponse(42)).toBe(false);
    const reservation = { id: 'r', event_id: 'e', display_name: 'n', email: null, status: 'confirmed' };
    expect(isReserveResponse({ reservation })).toBe(false);
  });

  it('isSearchResultWire non-object', () => {
    expect(isSearchResultWire(42)).toBe(false);
  });

  it('isEventPublicWire missing properties like location_text and tags', () => {
    const base: Record<string, unknown> = {
      id: '1', title: 't', description: null, type: null,
      starts_at: '2025-01-01T00:00:00.000Z', ends_at: '2025-01-01T01:00:00.000Z',
      discord_link: null, website_link: null, public: true, capacity: 1, confirmed_count: 0, waitlist_count: 0, requires_join_code: false,
    };
    expect(isEventPublicWire(base)).toBe(false);
    const noTags = { ...base, location_text: null };
    expect(isEventPublicWire(noTags)).toBe(false);
  });

  it('isEventPublicWire missing title and wrong title type', () => {
    const base: Record<string, unknown> = {
      id: '1', description: null, type: null,
      starts_at: '2025-01-01T00:00:00.000Z', ends_at: '2025-01-01T01:00:00.000Z',
      location_text: null, discord_link: null, website_link: null, tags: [], public: true, capacity: 1,
      confirmed_count: 0, waitlist_count: 0, requires_join_code: false,
    };
    expect(isEventPublicWire(base)).toBe(false);
    const wrong: Record<string, unknown> = { ...base, title: 123 };
    expect(isEventPublicWire(wrong)).toBe(false);
  });

  it('isEventPublicWire wrong starts_at and ends_at types', () => {
    const base: Record<string, unknown> = {
      id: '1', title: 't', description: null, type: null,
      starts_at: '2025-01-01T00:00:00.000Z', ends_at: '2025-01-01T01:00:00.000Z',
      location_text: null, discord_link: null, website_link: null, tags: [], public: true, capacity: 1,
      confirmed_count: 0, waitlist_count: 0, requires_join_code: false,
    };
    const badStart = { ...base, starts_at: 123 } as Record<string, unknown>;
    const badEnd = { ...base, ends_at: 123 } as Record<string, unknown>;
    expect(isEventPublicWire(badStart)).toBe(false);
    expect(isEventPublicWire(badEnd)).toBe(false);
  });

  it('isEventPublicWire wrong location_text type', () => {
    const base: Record<string, unknown> = {
      id: '1', title: 't', description: null, type: null,
      starts_at: '2025-01-01T00:00:00.000Z', ends_at: '2025-01-01T01:00:00.000Z',
      location_text: null, discord_link: null, website_link: null, tags: [], public: true, capacity: 1,
      confirmed_count: 0, waitlist_count: 0, requires_join_code: false,
    };
    expect(isEventPublicWire({ ...base, location_text: 5 })).toBe(false);
  });

  it('isReservationOut wrong email type', () => {
    const bad: Record<string, unknown> = { id: 'r', event_id: 'e', display_name: 'n', email: 5, status: 'confirmed' };
    expect(isReservationOut(bad)).toBe(false);
  });

  it('isEventPublicWire missing description and type', () => {
    const base: Record<string, unknown> = {
      id: '1', title: 't',
      starts_at: '2025-01-01T00:00:00.000Z', ends_at: '2025-01-01T01:00:00.000Z',
      location_text: null, discord_link: null, website_link: null, tags: [], public: true, capacity: 1,
      confirmed_count: 0, waitlist_count: 0, requires_join_code: false,
    };
    expect(isEventPublicWire(base)).toBe(false);
    const noType: Record<string, unknown> = { ...base, description: null };
    expect(isEventPublicWire(noType)).toBe(false);
  });
});
