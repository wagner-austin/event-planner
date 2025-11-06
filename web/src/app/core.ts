import { qsStrictEl, qsStrictInput, setText, hide, show } from '../util/dom.js';
import { isUciEmail } from '../util/validate.js';
import { toEventView, type SearchResultWire } from '../types.js';
import { setReservationToken, clearReservationToken, clearAllReservationTokens, setAuthToken, getAuthToken, clearAuthToken, setLastSelectedEvent, getLastSelectedEvent, listReservationEntries } from '../state/tokenStore.js';
import { renderEventCard, setNoReservationUI, fmtRange, showBanner, hideBanner } from './view.js';
import { restoreLastEvent } from './restore.js';
import type { AppDeps } from './deps.js';

function errMsg(err: unknown): string { return err instanceof Error ? err.message : String(err); }

export function createApp(doc: Document, deps: AppDeps): { init: () => Promise<void>; refresh: () => Promise<void>; search: (append: boolean) => Promise<void> } {
  let client = deps.makeClient('');
  let currentEventId: string | null = null;
  const params = new URLSearchParams();
  const instanceId = `${Date.now()}:${Math.random()}`;
  const isActive = (): boolean => doc.body.getAttribute('data-app-instance') === instanceId;
  doc.body.setAttribute('data-app-instance', instanceId);

  const weekRangeUtc = (now: Date): { startIso: string; toIso: string } => {
    const y = now.getUTCFullYear();
    const m = now.getUTCMonth();
    const d = now.getUTCDate();
    const dow = now.getUTCDay(); // 0=Sun..6=Sat
    const mondayDelta = (dow + 6) % 7; // days since Monday
    const start = new Date(Date.UTC(y, m, d - mondayDelta, 0, 0, 0, 0));
    const to = new Date(start.getTime() + 7 * 24 * 60 * 60 * 1000 - 1);
    return { startIso: start.toISOString(), toIso: to.toISOString() };
  };

  const monthRangeUtc = (now: Date): { startIso: string; toIso: string } => {
    const y = now.getUTCFullYear();
    const m = now.getUTCMonth();
    const start = new Date(Date.UTC(y, m, 1, 0, 0, 0, 0));
    const nextMonth = m === 11 ? new Date(Date.UTC(y + 1, 0, 1, 0, 0, 0, 0)) : new Date(Date.UTC(y, m + 1, 1, 0, 0, 0, 0));
    const to = new Date(nextMonth.getTime() - 1);
    return { startIso: start.toISOString(), toIso: to.toISOString() };
  };

  const refreshMyReservation = async (): Promise<void> => {
    if (!isActive()) return;
    const my = doc.querySelector<HTMLElement>('#my-reservation');
    const cancelBtn = doc.querySelector<HTMLElement>('#cancel-reservation');
    if (!my || !cancelBtn) return; // Section not present; nothing to do
    if (!currentEventId) { setNoReservationUI(doc); return; }

    // Use auth token to check for reservation (not reservation token)
    const authToken = getAuthToken();
    if (!authToken) { setNoReservationUI(doc); return; }

    try {
      const r = await client.getMyReservation(currentEventId, authToken);
      setText(my, `${r.display_name} – ${r.status}`);
      cancelBtn.classList.remove('hidden');
    } catch (err) {
      deps.log.warn('getMyReservation failed', { err: errMsg(err) });
      setText(my, 'No reservation found.');
      cancelBtn.classList.add('hidden');
    }
  };

  const refreshAllReservations = async (): Promise<void> => {
    if (!isActive()) return;
    const my = doc.querySelector<HTMLElement>('#my-reservation');
    if (!my) return; // Section not present; nothing to do

    // Only show reservations if user is authenticated
    const authToken = getAuthToken();
    if (!authToken) {
      setText(my, 'No reservation yet.');
      return;
    }

    const entries = listReservationEntries();
    if (entries.length === 0) {
      setText(my, 'No reservation yet.');
      return;
    }

    const list = document.createElement('ul');
    list.className = 'list';
    list.setAttribute('aria-live', 'polite');
    for (const e of entries) {
      try {
        // Use auth token to fetch reservation (not reservation token)
        const [resv, ev] = await Promise.all([
          client.getMyReservation(e.eventId, authToken),
          client.getEvent(e.eventId),
        ]);
        const li = document.createElement('li');
        const text = document.createElement('span');
        text.textContent = `${ev.title} — ${resv.display_name} (${resv.status})`;
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'btn btn--danger btn--chip';
        btn.textContent = 'Cancel';
        btn.setAttribute('data-action', 'cancel-item');
        btn.setAttribute('data-event-id', e.eventId);
        li.append(text, btn);
        list.appendChild(li);
      } catch (err) {
        deps.log.warn('render reservation item failed', { err: errMsg(err) });
        // If reservation not found, remove the token from localStorage
        clearReservationToken(e.eventId);
      }
    }
    my.innerHTML = '';
    my.appendChild(list);
  };

  const showEventDetails = async (eventId: string): Promise<void> => {
    if (!isActive()) return;
    const banner = qsStrictEl('#error-banner', doc);
    try {
      currentEventId = eventId;
      setLastSelectedEvent(eventId);
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

    const qBase = qsStrictInput('#q', doc).value.trim();
    const clubSel = doc.querySelector<HTMLSelectElement>('#club-filter');
    const dateSel = doc.querySelector<HTMLSelectElement>('#date-filter');

    let effQ = qBase;
    if (clubSel && clubSel.value && clubSel.value !== 'all') {
      effQ = effQ ? `${clubSel.value} ${effQ}` : clubSel.value;
    }

    let start = qsStrictInput('#start', doc).value;
    let to = qsStrictInput('#to', doc).value;
    if (dateSel && dateSel.value && dateSel.value !== 'all') {
      const now = new Date();
      if (dateSel.value === 'week') {
        const r = weekRangeUtc(now);
        start = r.startIso;
        to = r.toIso;
      } else if (dateSel.value === 'month') {
        const r = monthRangeUtc(now);
        start = r.startIso;
        to = r.toIso;
      }
    }

    if (effQ) params.set('q', effQ); else params.delete('q');
    if (start) params.set('start', start); else params.delete('start');
    if (to) params.set('to', to); else params.delete('to');

    const query: { q?: string; start?: string; to?: string; limit: number; offset: number } = { limit, offset };
    if (effQ) query.q = effQ;
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

            // Prevent race condition: check button state and disable immediately
            const submitBtn = form.querySelector<HTMLButtonElement>('button[type="submit"]');
            if (!submitBtn || submitBtn.disabled) return;
            submitBtn.disabled = true;

            // Validation checks - reset button state if validation fails
            const authTok = getAuthToken();
            if (!authTok) {
              showBanner(doc, 'Please sign in to reserve');
              submitBtn.disabled = false;
              return;
            }

            const eventId = currentEventId;
            if (!eventId) {
              submitBtn.disabled = false;
              return;
            }

            const display_name = qsStrictInput('#display_name', doc).value.trim();
            const emailVal = qsStrictInput('#email', doc).value.trim();
            if (emailVal && !isUciEmail(emailVal)) {
              showBanner(doc, 'UCI email (@uci.edu) required');
              submitBtn.disabled = false;
              return;
            }

            const joinCodeInput = doc.querySelector<HTMLInputElement>('#join_code');
            const join_codeVal = (joinCodeInput && typeof joinCodeInput.value === 'string') ? joinCodeInput.value.trim() : '';

            // Make API call
            client.reserve(eventId, { display_name, email: emailVal || null, join_code: join_codeVal || null }, authTok).then(res => {
              setReservationToken(eventId, res.token);
              setText(qsStrictEl('#rsvp-result', doc), `Reservation ${res.reservation.status}`);
              // Refresh event details to update attendee count, and refresh reservation displays
              return Promise.all([
                showEventDetails(eventId),
                refreshMyReservation(),
                refreshAllReservations(),
              ]);
            }).catch(() => {
              showBanner(doc, 'RSVP failed');
            }).finally(() => {
              submitBtn.disabled = false;
            });
          });
          form.dataset.boundRsvp = '1';
        };
        const showLoggedIn = (name: string): void => {
          const res = doc.querySelector<HTMLElement>('#login-result');
          if (res) setText(res, `Signed in: ${name}`);
          const lf = doc.querySelector<HTMLFormElement>('#login-form');
          if (lf) lf.classList.add('hidden');
          const chip = doc.querySelector<HTMLElement>('#auth-chip');
          if (chip) chip.classList.remove('hidden');
          const nameEl = doc.querySelector<HTMLElement>('#auth-name');
          if (nameEl) nameEl.textContent = name;
          for (const a of Array.from(doc.querySelectorAll<HTMLElement>('.nav__link'))) { a.classList.add('hidden'); }
          // Hide RSVP name/email fields when authenticated
          const dnLabel = doc.querySelector<HTMLElement>('label[for="display_name"]');
          const dnInput = doc.querySelector<HTMLElement>('#display_name');
          const emLabel = doc.querySelector<HTMLElement>('label[for="email"]');
          const emInput = doc.querySelector<HTMLElement>('#email');
          dnLabel?.classList.add('hidden');
          dnInput?.classList.add('hidden');
          emLabel?.classList.add('hidden');
          emInput?.classList.add('hidden');
        };
        const showLoggedOut = (): void => {
          const res = doc.querySelector<HTMLElement>('#login-result');
          if (res) setText(res, '');
          const lf = doc.querySelector<HTMLFormElement>('#login-form');
          if (lf) lf.classList.remove('hidden');
          const chip = doc.querySelector<HTMLElement>('#auth-chip');
          if (chip) chip.classList.add('hidden');
          const nameEl = doc.querySelector<HTMLElement>('#auth-name');
          if (nameEl) nameEl.textContent = '';
          for (const a of Array.from(doc.querySelectorAll<HTMLElement>('.nav__link'))) { a.classList.remove('hidden'); }
          // Show RSVP name/email fields when logged out
          const dnLabel = doc.querySelector<HTMLElement>('label[for="display_name"]');
          const dnInput = doc.querySelector<HTMLElement>('#display_name');
          const emLabel = doc.querySelector<HTMLElement>('label[for="email"]');
          const emInput = doc.querySelector<HTMLElement>('#email');
          dnLabel?.classList.remove('hidden');
          dnInput?.classList.remove('hidden');
          emLabel?.classList.remove('hidden');
          emInput?.classList.remove('hidden');
        };

        const bindLoginSubmit = (form: HTMLFormElement): void => {
          if (form.dataset.boundLogin === '1') return;
          form.addEventListener('submit', (ev: SubmitEvent) => {
            if (!isActive()) return;
            ev.preventDefault();
            hideBanner(doc);
            const display_name = qsStrictInput('#login_display_name', doc).value.trim();
            const email = qsStrictInput('#login_email', doc).value.trim();
            if (!display_name) { showBanner(doc, 'Name is required'); return; }
            if (!isUciEmail(email)) { showBanner(doc, 'UCI email (@uci.edu) required'); return; }
            client.login({ display_name, email })
              .then(res => { setAuthToken(res.token); showLoggedIn(res.profile.display_name); })
              .catch(() => { showBanner(doc, 'Sign in failed'); });
          });
          form.dataset.boundLogin = '1';
        };
        const tryBindForms = (): void => {
          const searchForm = doc.querySelector<HTMLFormElement>('#search-form');
          if (searchForm) bindSearchSubmit(searchForm);
          const rsvpForm = doc.querySelector<HTMLFormElement>('#rsvp-form');
          if (rsvpForm) bindRsvpSubmit(rsvpForm);
          const loginForm = doc.querySelector<HTMLFormElement>('#login-form');
          if (loginForm) bindLoginSubmit(loginForm);
        };
        const bindFilters = (): void => {
          const club = doc.querySelector<HTMLSelectElement>('#club-filter');
          if (club && club.dataset.bound !== '1') {
            club.addEventListener('change', () => { if (isActive()) { params.set('offset','0'); doSearch(false).catch(() => { showBanner(doc, 'Search failed'); }); } });
            club.dataset.bound = '1';
          }
          const date = doc.querySelector<HTMLSelectElement>('#date-filter');
          if (date && date.dataset.bound !== '1') {
            date.addEventListener('change', () => { if (isActive()) { params.set('offset','0'); doSearch(false).catch(() => { showBanner(doc, 'Search failed'); }); } });
            date.dataset.bound = '1';
          }
        };
        tryBindForms();
        // Auth restore on init
        const tok = getAuthToken();
        if (tok) {
          client.getMe(tok)
            .then(p => { if (isActive()) showLoggedIn(p.display_name); })
            .catch(() => { clearAuthToken(); showLoggedOut(); });
        } else {
          showLoggedOut();
        }
        bindFilters();
        const observer = new MutationObserver(() => { if (typeof document !== 'undefined' && isActive()) { tryBindForms(); } });
        observer.observe(doc.body, { childList: true, subtree: true });

        // Delegated clicks: load more, cancel, logout
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
            const authToken = getAuthToken();
            if (!authToken) { showBanner(doc, 'Please sign in to cancel'); return; }
            const btn = qsStrictEl('#cancel-reservation', doc);
            btn.setAttribute('disabled', 'true');
            const prev = btn.textContent || '';
            btn.textContent = 'Canceling...';
            client.cancelMyReservation(eventId, authToken).then(() => {
              clearReservationToken(eventId);
              return Promise.all([showEventDetails(eventId), refreshMyReservation(), refreshAllReservations()]);
            }).catch(() => { showBanner(doc, 'Cancel failed'); }).finally(() => { btn.textContent = prev; btn.removeAttribute('disabled'); });
          } else if (t.dataset.action === 'cancel-item' || !!t.closest('[data-action="cancel-item"]')) {
            hideBanner(doc);
            const authToken = getAuthToken();
            if (!authToken) { showBanner(doc, 'Please sign in to cancel'); return; }
            let btnEl: HTMLElement | null = null;
            if (t.dataset.action === 'cancel-item') {
              btnEl = t;
            } else {
              const found = t.closest('[data-action="cancel-item"]');
              btnEl = found instanceof HTMLElement ? found : null;
            }
            if (btnEl === null) return;
            const eid = btnEl.getAttribute('data-event-id');
            if (!eid) return;
            btnEl.setAttribute('disabled', 'true');
            const prevText = btnEl.textContent || '';
            btnEl.textContent = 'Canceling...';
            client.cancelMyReservation(eid, authToken).then(() => {
              clearReservationToken(eid);
              // Refresh event details if it's currently shown, otherwise just refresh lists
              const isCurrentEvent = currentEventId === eid;
              const tasks = [refreshMyReservation(), refreshAllReservations()];
              if (isCurrentEvent) tasks.unshift(showEventDetails(eid));
              return Promise.all(tasks);
            }).catch(() => { btnEl.textContent = prevText; btnEl.removeAttribute('disabled'); showBanner(doc, 'Cancel failed'); });
          } else if (t.id === 'logout' || !!t.closest('#logout')) {
            clearAuthToken();
            clearAllReservationTokens();
            showLoggedOut();
            void Promise.all([refreshMyReservation(), refreshAllReservations()]);
          }
        });

        await Promise.all([refreshMyReservation(), refreshAllReservations()]);
        await doSearch(false);
        // Restore last selected event details (and thus my reservation UI) if present
        restoreLastEvent(getLastSelectedEvent, (id) => { void showEventDetails(id); });
      } catch {
        setText(banner, 'Initialization failed');
        show(banner);
      }
    },
    refresh: refreshMyReservation,
    search: doSearch,
  };
}
