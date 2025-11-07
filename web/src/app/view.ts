import { qsStrictEl, setText, hide, show } from '../util/dom.js';
import { toEventView } from '../types.js';

export function fmtRange(start: Date, end: Date): string {
  const opts: Intl.DateTimeFormatOptions = {
    year: 'numeric',
    month: 'numeric',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true
  };
  const d1 = start.toLocaleString(undefined, opts);
  const d2 = end.toLocaleString(undefined, opts);
  return `${d1} - ${d2}`;
}

export function setNoReservationUI(doc: Document): void {
  const my = qsStrictEl('#my-reservation', doc);
  const cancelBtn = qsStrictEl('#cancel-reservation', doc);
  setText(my, 'No reservation yet.');
  cancelBtn.classList.add('hidden');
}

export function renderEventCard(e: ReturnType<typeof toEventView>, onOpen: (eventId: string) => void): HTMLElement {
  const card = document.createElement('article');
  card.className = 'card card--clickable';
  card.setAttribute('role', 'button');
  card.setAttribute('tabindex', '0');
  card.addEventListener('click', () => {
    onOpen(e.id);
  });
  card.addEventListener('keydown', (ev) => {
    if (ev.key === 'Enter' || ev.key === ' ') {
      ev.preventDefault();
      onOpen(e.id);
    }
  });
  const title = document.createElement('h3');
  title.className = 'card__title';
  title.textContent = e.title;
  const meta = document.createElement('div');
  meta.className = 'card__meta';
  meta.textContent = `${fmtRange(e.startsAt, e.endsAt)} • ${e.locationText ?? 'TBD'} • ${e.confirmedCount}/${e.capacity}`;
  const desc = document.createElement('p');
  desc.className = 'card__desc';
  desc.textContent = e.description ?? '';
  card.append(title, meta, desc);
  return card;
}

export function showBanner(doc: Document, text: string): void {
  const banner = qsStrictEl('#error-banner', doc);
  setText(banner, text);
  show(banner);
}

export function hideBanner(doc: Document): void {
  hide(qsStrictEl('#error-banner', doc));
}

