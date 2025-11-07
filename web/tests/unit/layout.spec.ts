import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { JSDOM } from 'jsdom';

const __dirname = dirname(fileURLToPath(import.meta.url));

function readHtml(filename: string): string {
  const path = join(__dirname, '..', '..', filename);
  return readFileSync(path, 'utf-8');
}

describe('frontend layout integration', () => {
  it('includes team CSS and CSP for map', () => {
    const html = readHtml('index.html');
    expect(html).toContain('assets/js/app.js');
    expect(html).toContain('assets/css/NewTestCSS.css');
    expect(html).toContain('Content-Security-Policy');
    expect(html).toMatch(/frame-src[^>]*https:\/\/map\.uci\.edu/);
  });

  it('exposes required SPA hooks by ID', () => {
    const html = readHtml('index.html');
    const dom = new JSDOM(html);
    const d = dom.window.document;
    const mustHave = [
      '#error-banner',
      '#search-form', '#q', '#start', '#to', '#limit',
      '#results', '#load-more',
      '#details', '#event-title', '#event-datetime', '#event-location', '#event-desc', '#event-stats',
      '#rsvp-form', '#rsvp-result', '#join-code-row', '#join_code',
      '#my-reservation', '#cancel-reservation',
    ];
    for (const sel of mustHave) {
      const el = d.querySelector(sel);
      expect(el, `missing ${sel}`).not.toBeNull();
    }
    // Styling class synergy: cards-grid + list grid for SPA cards
    const results = d.querySelector('#results') as HTMLElement | null;
    expect(results?.className || '').toMatch(/cards-grid/);
  });
});

