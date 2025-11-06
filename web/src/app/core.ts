import { qsStrictEl, qsStrictInput, setText, hide, show } from '../util/dom.js';
import { toEventView, type SearchResultWire } from '../types.js';
import { getReservationToken, setReservationToken, clearReservationToken } from '../state/tokenStore.js';
import { renderEventCard, setNoReservationUI, fmtRange, showBanner, hideBanner } from './view.js';
import type { AppDeps } from './deps.js';

function errMsg(err: unknown): string { return err instanceof Error ? err.message : String(err); }

export function createApp(doc: Document, deps: AppDeps): { init: () => Promise<void>; refresh: () => Promise<void>; search: (append: boolean) => Promise<void> } {
  let client = deps.makeClient('');
  let currentEventId: string | null = null;
  const params = new URLSearchParams();
  const instanceId = `${Date.now()}:${Math.random()}`;
  const isActive = (): boolean => doc.body.getAttribute('data-app-instance') === instanceId;
  doc.body.setAttribute('data-app-instance', instanceId);

  const refreshMyReservation = async (): Promise<void> => {
    if (!isActive()) return;
    const my = qsStrictEl('#my-reservation', doc);
    const cancelBtn = qsStrictEl('#cancel-reservation', doc);
    if (!currentEventId) { setNoReservationUI(doc); return; }
    const token = getReservationToken(currentEventId);
    if (!token) { setNoReservationUI(doc); return; }
    try {
      const r = await client.getMyReservation(currentEventId, token);
      setText(my, `${r.display_name} - ${r.status}`);
      cancelBtn.classList.remove('hidden');
    } catch (err) {
      deps.log.warn('getMyReservation failed', { err: errMsg(err) });
      setText(my, 'No reservation found.');
      cancelBtn.classList.add('hidden');
    }
  };

  const showEventDetails = async (eventId: string): Promise<void> => {
    if (!isActive()) return;
    const banner = qsStrictEl('#error-banner', doc);
    try {
      currentEventId = eventId;
      const evw = await client.getEvent(eventId);
      const ev = toEventView(evw);
      setText(qsStrictEl('#event-title', doc), ev.title);
      setText(qsStrictEl('#event-datetime', doc), fmtRange(ev.startsAt, ev.endsAt));
      setText(qsStrictEl('#event-location', doc), ev.locationText ?? 'TBD');
      setText(qsStrictEl('#event-desc', doc), ev.description ?? '');
      setText(qsStrictEl('#event-stats', doc), `${ev.confirmedCount}/${ev.capacity} attending`);
      const jrow = qsStrictEl('#join-code-row', doc);
      if (ev.requiresJoinCode) { show(jrow); } else { hide(jrow); }
      await refreshMyReservation();
      const detailsEl = qsStrictEl('#details', doc);
      if (typeof detailsEl.scrollIntoView === 'function') {
        detailsEl.scrollIntoView({ behavior: 'smooth' });
      }
    } catch (err) {
      deps.log.error('showEventDetails failed', { err: errMsg(err) });
      setText(banner, 'Failed to load event');
      show(banner);
    }
  };

  const doSearch = async (append: boolean): Promise<void> => {
    if (!isActive()) return;
    hideBanner(doc);
    const limitRaw = Number(qsStrictInput('#limit', doc).value);
    const limit = Number.isFinite(limitRaw) && limitRaw > 0 ? limitRaw : 10;
    const offset = Number(params.get('offset') || '0') || 0;
    const q = qsStrictInput('#q', doc).value.trim();
    const start = qsStrictInput('#start', doc).value;
    const to = qsStrictInput('#to', doc).value;
    if (q) params.set('q', q); else params.delete('q');
    if (start) params.set('start', start); else params.delete('start');
    if (to) params.set('to', to); else params.delete('to');

    const query: { q?: string; start?: string; to?: string; limit: number; offset: number } = { limit, offset };
    if (q) query.q = q;
    if (start) query.start = start;
    if (to) query.to = to;
    const res: SearchResultWire = await client.search(query);
    const view = res.events.map(toEventView);
    const resultsElNow = qsStrictEl('#results', doc);
    if (!append) resultsElNow.innerHTML = '';
    for (const ev of view) resultsElNow.appendChild(renderEventCard(ev, (id) => { void showEventDetails(id); }));
    const newOffset = offset + view.length;
    params.set('offset', String(newOffset));
    const loadMoreBtnNow = qsStrictEl('#load-more', doc);
    if (newOffset >= res.total || view.length === 0) { loadMoreBtnNow.setAttribute('disabled', 'true'); }
    else { loadMoreBtnNow.removeAttribute('disabled'); }
  };

  return {
    init: async () => {
      const banner = qsStrictEl('#error-banner', doc);
      try {
        const cfg = await deps.loadConfig();
        client = deps.makeClient(cfg.API_BASE_URL);

        // Bind submit handlers to forms; re-bind if DOM is replaced.
        const bindSearchSubmit = (form: HTMLFormElement): void => {
          if (form.dataset.boundSearch === '1') return;
          form.addEventListener('submit', (ev: SubmitEvent) => {
            if (!isActive()) return;
            ev.preventDefault();
            params.set('offset', '0');
            doSearch(false).catch(() => { showBanner(doc, 'Search failed'); });
          });
          form.dataset.boundSearch = '1';
        };
        const bindRsvpSubmit = (form: HTMLFormElement): void => {
          if (form.dataset.boundRsvp === '1') return;
          form.addEventListener('submit', (ev: SubmitEvent) => {
            if (!isActive()) return;
            ev.preventDefault();
            hideBanner(doc);
            const eventId = currentEventId;
            if (!eventId) return;
            const display_name = qsStrictInput('#display_name', doc).value.trim();
            const emailVal = qsStrictInput('#email', doc).value.trim();
            const joinCodeInput = doc.querySelector<HTMLInputElement>('#join_code');
            const join_codeVal = (joinCodeInput && typeof joinCodeInput.value === 'string') ? joinCodeInput.value.trim() : '';
            client.reserve(eventId, { display_name, email: emailVal || null, join_code: join_codeVal || null }).then(res => {
              setReservationToken(eventId, res.token);
              setText(qsStrictEl('#rsvp-result', doc), `Reservation ${res.reservation.status}`);
              return refreshMyReservation();
            }).catch(() => { showBanner(doc, 'RSVP failed'); });
          });
          form.dataset.boundRsvp = '1';
        };
        const tryBindForms = (): void => {
          const searchForm = doc.querySelector<HTMLFormElement>('#search-form');
          if (searchForm) bindSearchSubmit(searchForm);
          const rsvpForm = doc.querySelector<HTMLFormElement>('#rsvp-form');
          if (rsvpForm) bindRsvpSubmit(rsvpForm);
        };
        tryBindForms();
        const observer = new MutationObserver(() => { if (typeof document !== 'undefined' && isActive()) { tryBindForms(); } });
        observer.observe(doc.body, { childList: true, subtree: true });

        // Delegated clicks: load more and cancel
        doc.addEventListener('click', (ev) => {
          if (!isActive()) return;
          const t = ev.target;
          if (!(t instanceof HTMLElement)) return;
          if (t.id === 'load-more' || !!t.closest('#load-more')) {
            doSearch(true).catch(() => { showBanner(doc, 'Load more failed'); });
          } else if (t.id === 'cancel-reservation' || !!t.closest('#cancel-reservation')) {
            hideBanner(doc);
            const eventId = currentEventId;
            if (!eventId) { setNoReservationUI(doc); return; }
            const token = getReservationToken(eventId);
            if (!token) { setNoReservationUI(doc); return; }
            client.cancelMyReservation(eventId, token).then(() => {
              clearReservationToken(eventId);
              return refreshMyReservation();
            }).catch(() => { showBanner(doc, 'Cancel failed'); });
          }
        });

        await refreshMyReservation();
        await doSearch(false);
      } catch {
        setText(banner, 'Initialization failed');
        show(banner);
      }
    },
    refresh: refreshMyReservation,
    search: doSearch,
  };
}
