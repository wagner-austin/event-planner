import { describe, it, expect, beforeEach, afterEach } from 'vitest';

function dom() {
  document.body.innerHTML = `
    <section id="error-banner" class="banner banner--error hidden"></section>
    <section id="search"><form id="search-form" novalidate><input id="q" /><input id="start" /><input id="to" /><input id="limit" value="10" /></form><div id="results"></div><div class="actions"><button id="load-more">More</button></div></section>
    <section id="details" class="card"><h2 id="event-title"></h2><p id="event-datetime"></p><p id="event-location"></p><p id="event-desc"></p><p id="event-stats"></p></section>`;
}

describe('no last event restore path', () => {
  beforeEach(() => { localStorage.clear(); dom(); });
  afterEach(() => { localStorage.clear(); document.body.innerHTML = ''; });

  it('does not call showEventDetails when no last is stored', async () => {
    // No ics.last.event set
    await import('../../src/app');
    await new Promise((r) => setTimeout(r, 0));
    // Event title remains empty (no restore)
    const title = document.querySelector('#event-title') as HTMLElement;
    expect((title.textContent || '').length).toBe(0);
  });
});

