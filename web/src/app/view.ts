import { qsStrictEl, setText, hide, show } from '../util/dom.js';
import { toEventView } from '../types.js';

export function fmtRange(start: Date, end: Date): string {
  const d1 = start.toLocaleString();
  const d2 = end.toLocaleString();
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
  card.className = 'card';
  const title = document.createElement('h3');
  title.className = 'card__title';
  const a = document.createElement('a');
  a.href = `#details`;
  a.textContent = e.title;
  a.addEventListener('click', (ev) => {
    ev.preventDefault();
    onOpen(e.id);
  });
  title.appendChild(a);
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

