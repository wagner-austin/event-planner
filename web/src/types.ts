// Runtime validators and shared types for the frontend. No any, no casts.

export interface OkResponse { ok: true }

export interface EventPublicWire {
  id: string;
  title: string;
  description: string | null;
  type: string | null;
  starts_at: string; // ISO
  ends_at: string; // ISO
  location_text: string | null;
  discord_link: string | null;
  website_link: string | null;
  tags: string[];
  public: boolean;
  capacity: number;
  confirmed_count: number;
  waitlist_count: number;
  requires_join_code: boolean;
}

export interface SearchResultWire {
  events: EventPublicWire[];
  total: number;
}

export interface ProfileBody { email: string; display_name: string }
export interface ProfileOut { id: string; email: string; display_name: string }
export interface AuthResponse { profile: ProfileOut; token: string }

export interface ReserveBody { display_name: string; email: string | null; join_code: string | null }
export type ReservationStatus = 'confirmed' | 'waitlisted' | 'canceled'
export interface ReservationOut { id: string; event_id: string; display_name: string; email: string | null; status: ReservationStatus }
export interface ReserveResponse { reservation: ReservationOut; token: string }

export interface CancelResponse { status: 'canceled' }

export interface EventView {
  id: string;
  title: string;
  description: string | null;
  type: string | null;
  startsAt: Date;
  endsAt: Date;
  locationText: string | null;
  discordLink: string | null;
  websiteLink: string | null;
  tags: string[];
  public: boolean;
  capacity: number;
  confirmedCount: number;
  waitlistCount: number;
  requiresJoinCode: boolean;
}

function isObject(x: unknown): x is Record<string, unknown> {
  return typeof x === 'object' && x !== null;
}
function isString(x: unknown): x is string { return typeof x === 'string' }
function isNumber(x: unknown): x is number { return typeof x === 'number' && Number.isFinite(x) }
function isBoolean(x: unknown): x is boolean { return typeof x === 'boolean' }
function hasProp<K extends string>(o: unknown, k: K): o is Record<K, unknown> { return isObject(o) && (k in o); }

export function isOkResponse(x: unknown): x is OkResponse {
  return isObject(x) && x['ok'] === true;
}

export function isEventPublicWire(x: unknown): x is EventPublicWire {
  if (!isObject(x)) return false;
  if (!hasProp(x,'id') || !isString(x['id'])) return false;
  if (!hasProp(x,'title') || !isString(x['title'])) return false;
  if (!hasProp(x,'description')) return false; {
    const v = x['description'];
    if (!(v === null || isString(v))) return false;
  }
  if (!hasProp(x,'type')) return false; {
    const v = x['type'];
    if (!(v === null || isString(v))) return false;
  }
  if (!hasProp(x,'starts_at') || !isString(x['starts_at'])) return false;
  if (!hasProp(x,'ends_at') || !isString(x['ends_at'])) return false;
  if (!hasProp(x,'location_text')) return false; {
    const v = x['location_text'];
    if (!(v === null || isString(v))) return false;
  }
  if (!hasProp(x,'discord_link')) return false; {
    const v = x['discord_link'];
    if (!(v === null || isString(v))) return false;
  }
  if (!hasProp(x,'website_link')) return false; {
    const v = x['website_link'];
    if (!(v === null || isString(v))) return false;
  }
  if (!hasProp(x,'tags')) return false; {
    const v = x['tags'];
    if (!Array.isArray(v) || !v.every(isString)) return false;
  }
  if (!hasProp(x,'public') || !isBoolean(x['public'])) return false;
  if (!hasProp(x,'capacity') || !isNumber(x['capacity'])) return false;
  if (!hasProp(x,'confirmed_count') || !isNumber(x['confirmed_count'])) return false;
  if (!hasProp(x,'waitlist_count') || !isNumber(x['waitlist_count'])) return false;
  if (!hasProp(x,'requires_join_code') || !isBoolean(x['requires_join_code'])) return false;
  return true;
}

export function isSearchResultWire(x: unknown): x is SearchResultWire {
  if (!isObject(x)) return false;
  if (!hasProp(x,'events')) return false; {
    const v = x['events'];
    if (!Array.isArray(v) || !v.every(isEventPublicWire)) return false;
  }
  if (!hasProp(x,'total') || !isNumber(x['total'])) return false;
  return true;
}

export function isProfileOut(x: unknown): x is ProfileOut {
  return isObject(x) && isString(x['id']) && isString(x['email']) && isString(x['display_name']);
}

export function isAuthResponse(x: unknown): x is AuthResponse {
  if (!isObject(x)) return false;
  if (!hasProp(x,'profile') || !hasProp(x,'token')) return false;
  return isProfileOut(x['profile']) && isString(x['token']);
}

export function isReservationOut(x: unknown): x is ReservationOut {
  if (!isObject(x)) return false;
  if (!hasProp(x,'id') || !isString(x['id'])) return false;
  if (!hasProp(x,'event_id') || !isString(x['event_id'])) return false;
  if (!hasProp(x,'display_name') || !isString(x['display_name'])) return false;
  if (!hasProp(x,'email')) return false; {
    const v = x['email'];
    if (!(v === null || isString(v))) return false;
  }
  if (!hasProp(x,'status')) return false; {
    const v = x['status'];
    if (!(v === 'confirmed' || v === 'waitlisted' || v === 'canceled')) return false;
  }
  return true;
}

export function isReserveResponse(x: unknown): x is ReserveResponse {
  if (!isObject(x)) return false;
  if (!hasProp(x,'reservation') || !hasProp(x,'token')) return false;
  return isReservationOut(x['reservation']) && isString(x['token']);
}

export function isCancelResponse(x: unknown): x is CancelResponse {
  return isObject(x) && hasProp(x,'status') && x['status'] === 'canceled';
}

export function toEventView(w: EventPublicWire): EventView {
  const starts = new Date(w.starts_at);
  const ends = new Date(w.ends_at);
  if (Number.isNaN(starts.getTime()) || Number.isNaN(ends.getTime())) {
    throw new Error('Invalid event date');
  }
  return {
    id: w.id,
    title: w.title,
    description: w.description,
    type: w.type,
    startsAt: starts,
    endsAt: ends,
    locationText: w.location_text,
    discordLink: w.discord_link,
    websiteLink: w.website_link,
    tags: w.tags.slice(),
    public: w.public,
    capacity: w.capacity,
    confirmedCount: w.confirmed_count,
    waitlistCount: w.waitlist_count,
    requiresJoinCode: w.requires_join_code,
  };
}
