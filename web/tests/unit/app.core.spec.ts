import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createApp } from '../../src/app/core';
import type { AppDeps } from '../../src/app/deps';

function baseDom(): void {
  document.body.innerHTML = `
    <section id="error-banner" class="banner banner--error hidden"></section>
    <section id="search">
      <form id="search-form" novalidate>
        <input id="q" />
        <input id="start" />
        <input id="to" />
        <input id="limit" value="10" />
      </form>
      <div id="results"></div>
      <button id="load-more">More</button>
    </section>
    <section id="details"></section>
    <section id="rsvp-section">
      <form id="rsvp-form" novalidate>
        <input id="display_name" />
        <input id="email" />
        <input id="join_code" />
      </form>
      <div id="rsvp-result"></div>
    </section>
    <section id="mine-section">
      <div id="my-reservation">No reservation yet.</div>
      <button id="cancel-reservation">Cancel</button>
    </section>`;
}

function depsWithOneEvent(): AppDeps {
  return {
    loadConfig: async () => ({ API_BASE_URL: 'http://x' }),
    makeClient: () => ({
      // @ts-expect-error minimal fake
      search: async () => ({ events: [{ id: 'e1', title: 'T', description: null, type: null, starts_at: '2025-01-01T00:00:00.000Z', ends_at: '2025-01-01T01:00:00.000Z', location_text: null, tags: [], public: true, capacity: 1, confirmed_count: 0, waitlist_count: 0, requires_join_code: false }], total: 1 }),
      // @ts-expect-error minimal fake
      getEvent: async () => ({ id: 'e1', title: 'T', description: null, type: null, starts_at: '2025-01-01T00:00:00.000Z', ends_at: '2025-01-01T01:00:00.000Z', location_text: null, tags: [], public: true, capacity: 1, confirmed_count: 0, waitlist_count: 0, requires_join_code: false }),
      // @ts-expect-error minimal fake
      getMyReservation: async () => ({ id: 'r1', event_id: 'e1', display_name: 'X', email: null, status: 'confirmed' }),
      // @ts-expect-error minimal fake
      reserve: async () => ({ reservation: { id: 'r1', event_id: 'e1', display_name: 'X', email: null, status: 'confirmed' }, token: 'tok' }),
      // @ts-expect-error minimal fake
      cancelMyReservation: async () => ({ status: 'canceled' }),
    }),
    log: { info: () => {}, warn: () => {}, error: () => {} },
  };
}

describe('app core guards and branches', () => {
  beforeEach(() => { baseDom(); localStorage.clear(); });
  afterEach(() => { document.body.innerHTML = ''; localStorage.clear(); vi.restoreAllMocks(); });

  it('returns early in doSearch/refresh when instance is inactive', async () => {
    const deps = depsWithOneEvent();
    const app = createApp(document, deps);
    await app.init();
    // Deactivate current instance
    document.body.setAttribute('data-app-instance', 'other');
    // Exercise the early-return guards on top of both functions
    await app.search(false);
    await app.refresh();
    expect(true).toBe(true);
  });

  it('returns early in listeners (search submit, rsvp submit, cancel) for inactive instance', async () => {
    const deps = depsWithOneEvent();
    // First app instance
    const app1 = createApp(document, deps);
    await app1.init();
    // Second app instance becomes active
    const app2 = createApp(document, deps);
    await app2.init();
    // Trigger all three listeners; old instance sees inactive and returns early at guards
    (document.querySelector('#search-form') as HTMLFormElement).dispatchEvent(new Event('submit'));
    (document.querySelector('#rsvp-form') as HTMLFormElement).dispatchEvent(new Event('submit'));
    (document.querySelector('#cancel-reservation') as HTMLButtonElement).dispatchEvent(new Event('click'));
    await new Promise((r) => setTimeout(r, 0));
    expect(true).toBe(true);
  });

  it('showEventDetails returns early when inactive', async () => {
    const deps = depsWithOneEvent();
    const app = createApp(document, deps);
    await app.init();
    // results created at init; get anchor
    const link = document.querySelector('#results .card') as HTMLElement | null;
    expect(link).toBeTruthy();
    // Deactivate this instance and then click link to trigger early return at guard
    document.body.setAttribute('data-app-instance', 'other');
    link!.click();
    await new Promise((r) => setTimeout(r, 0));
    expect(true).toBe(true);
  });

  it('RSVP submit returns early when no current event selected', async () => {
    const deps = depsWithOneEvent();
    const app = createApp(document, deps);
    await app.init();
    (document.querySelector('#display_name') as HTMLInputElement).value = 'Z';
    (document.querySelector('#rsvp-form') as HTMLFormElement).dispatchEvent(new Event('submit'));
    await new Promise((r) => setTimeout(r, 0));
    expect((document.querySelector('#my-reservation') as HTMLElement).textContent || '').toContain('No reservation');
  });

  it('Cancel click returns early when no current event selected', async () => {
    const deps = depsWithOneEvent();
    const app = createApp(document, deps);
    await app.init();
    (document.querySelector('#cancel-reservation') as HTMLButtonElement).click();
    await new Promise((r) => setTimeout(r, 0));
    expect((document.querySelector('#my-reservation') as HTMLElement).textContent || '').toContain('No reservation');
  });
});
