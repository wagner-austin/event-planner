import { describe, it, expect } from 'vitest';
import { isOkResponse, isAuthResponse, isReserveResponse, isReservationOut, isCancelResponse, isEventPublicWire, isSearchResultWire } from '../../src/types';

describe('extra type guards', () => {
  it('isOkResponse', () => {
    expect(isOkResponse({ ok: true })).toBe(true);
    expect(isOkResponse({})).toBe(false);
  });

  it('auth + reservation guards', () => {
    const profile = { id: 'p1', email: 'e', display_name: 'n' };
    expect(isAuthResponse({ profile, token: 't' })).toBe(true);
    expect(isAuthResponse({ profile })).toBe(false);

    const reservation = { id: 'r', event_id: 'e', display_name: 'n', email: null, status: 'confirmed' };
    expect(isReservationOut(reservation)).toBe(true);
    expect(isReserveResponse({ reservation, token: 't' })).toBe(true);
  });

  it('cancel response', () => {
    expect(isCancelResponse({ status: 'canceled' })).toBe(true);
    expect(isCancelResponse({ status: 'ok' })).toBe(false);
  });

  it('event wire invalid property branches', () => {
    const base: Record<string, unknown> = {
      id: '1', title: 't', description: null, type: null,
      starts_at: '2025-01-01T00:00:00.000Z', ends_at: '2025-01-01T01:00:00.000Z',
      location_text: null, tags: [], public: true, capacity: 1,
      confirmed_count: 0, waitlist_count: 0, requires_join_code: false,
    };
    expect(isEventPublicWire(base)).toBe(true);
    expect(isEventPublicWire({ ...base, description: 42 })).toBe(false);
    expect(isEventPublicWire({ ...base, type: 42 })).toBe(false);
    expect(isEventPublicWire({ ...base, tags: ['ok', 1] })).toBe(false);
    expect(isEventPublicWire({ ...base, public: 'yes' })).toBe(false);
    expect(isEventPublicWire({ ...base, capacity: '1' })).toBe(false);
    expect(isEventPublicWire({ ...base, confirmed_count: '0' })).toBe(false);
    expect(isEventPublicWire({ ...base, waitlist_count: '0' })).toBe(false);
    expect(isEventPublicWire({ ...base, requires_join_code: 'no' })).toBe(false);
  });

  it('search result invalid events array', () => {
    const goodEv: Record<string, unknown> = {
      id: '1', title: 't', description: null, type: null,
      starts_at: '2025-01-01T00:00:00.000Z', ends_at: '2025-01-01T01:00:00.000Z',
      location_text: null, tags: [], public: true, capacity: 1,
      confirmed_count: 0, waitlist_count: 0, requires_join_code: false,
    };
    expect(isSearchResultWire({ events: [goodEv], total: 1 })).toBe(true);
    expect(isSearchResultWire({ events: [{}], total: 1 })).toBe(false);
    expect(isSearchResultWire({ events: [goodEv], total: '1' })).toBe(false);
  });

  it('event wire accepts string variants for nullable fields', () => {
    const ev: Record<string, unknown> = {
      id: '1', title: 't', description: 'desc', type: 't',
      starts_at: '2025-01-01T00:00:00.000Z', ends_at: '2025-01-01T01:00:00.000Z',
      location_text: 'loc', tags: ['tag'], public: true, capacity: 1,
      confirmed_count: 0, waitlist_count: 0, requires_join_code: false,
    };
    expect(isEventPublicWire(ev)).toBe(true);
  });

  it('reservation accepts email as string as well as null', () => {
    const r: Record<string, unknown> = { id: 'r', event_id: 'e', display_name: 'n', email: 'e@example.com', status: 'confirmed' };
    expect(isReservationOut(r)).toBe(true);
  });

  it('reservation missing fields and invalid status', () => {
    expect(isReservationOut({})).toBe(false);
    const missingEmail = { id: 'r', event_id: 'e', display_name: 'n', status: 'confirmed' };
    expect(isReservationOut(missingEmail)).toBe(false);
    const badStatus = { id: 'r', event_id: 'e', display_name: 'n', email: null, status: 'bad' };
    expect(isReservationOut(badStatus)).toBe(false);
  });

  it('reserve response requires reservation and token', () => {
    const goodRes = { id: 'r', event_id: 'e', display_name: 'n', email: null, status: 'confirmed' };
    expect(isReserveResponse({ reservation: goodRes, token: 't' })).toBe(true);
    expect(isReserveResponse({ reservation: goodRes })).toBe(false);
    expect(isReserveResponse({ token: 't' })).toBe(false);
  });
});
