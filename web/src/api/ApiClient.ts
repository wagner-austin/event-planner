import { httpJson } from './http.js';
import {
  isOkResponse,
  isSearchResultWire,
  isEventPublicWire,
  isAuthResponse,
  isReservationOut,
  isReserveResponse,
  isCancelResponse,
  isProfileOut,
  type ProfileBody,
  type SearchResultWire,
  type EventPublicWire,
  type AuthResponse,
  type ReservationOut,
  type ReserveBody,
  type ReserveResponse,
  type CancelResponse,
  type OkResponse,
  type ProfileOut,
} from '../types.js';

export class ApiClient {
  private readonly base: string;
  constructor(baseUrl: string) { this.base = baseUrl.replace(/\/$/, ''); }

  async health(): Promise<OkResponse> {
    const { data } = await httpJson('GET', `${this.base}/health`);
    if (!isOkResponse(data)) throw new Error('Invalid health response');
    return data;
  }

  async search(p: { q?: string; start?: string; to?: string; limit?: number; offset?: number }): Promise<SearchResultWire> {
    const params = new URLSearchParams();
    if (p.q) params.set('q', p.q);
    if (p.start) params.set('start', p.start);
    if (p.to) params.set('to', p.to);
    if (typeof p.limit === 'number') params.set('limit', String(p.limit));
    if (typeof p.offset === 'number') params.set('offset', String(p.offset));
    const { data } = await httpJson('GET', `${this.base}/search?${params.toString()}`);
    if (!isSearchResultWire(data)) throw new Error('Invalid search response');
    return data;
  }

  async getEvent(id: string): Promise<EventPublicWire> {
    const { data } = await httpJson('GET', `${this.base}/events/${encodeURIComponent(id)}`);
    if (!isEventPublicWire(data)) throw new Error('Invalid event response');
    return data;
  }

  async login(body: ProfileBody): Promise<AuthResponse> {
    const { data } = await httpJson('POST', `${this.base}/auth/login`, body);
    if (!isAuthResponse(data)) throw new Error('Invalid auth response');
    return data;
  }

  async getMe(token: string): Promise<ProfileOut> {
    const { data } = await httpJson('GET', `${this.base}/auth/me`, undefined, undefined, { 'Authorization': `Bearer ${token}` });
    if (!isProfileOut(data)) throw new Error('Invalid me response');
    return data;
  }

  async reserve(eventId: string, b: ReserveBody): Promise<ReserveResponse> {
    const { data } = await httpJson('POST', `${this.base}/events/${encodeURIComponent(eventId)}/reserve`, b);
    if (!isReserveResponse(data)) throw new Error('Invalid reserve response');
    return data;
  }

  async getMyReservation(eventId: string, token: string): Promise<ReservationOut> {
    const { data } = await httpJson('GET', `${this.base}/events/${encodeURIComponent(eventId)}/mine`, undefined, undefined, { 'Authorization': `Bearer ${token}` });
    if (!isReservationOut(data)) throw new Error('Invalid reservation');
    return data;
  }

  async cancelMyReservation(eventId: string, token: string): Promise<CancelResponse> {
    const { data } = await httpJson('POST', `${this.base}/events/${encodeURIComponent(eventId)}/cancel`, {}, undefined, { 'Authorization': `Bearer ${token}` });
    if (!isCancelResponse(data)) throw new Error('Invalid cancel response');
    return data;
  }
}
