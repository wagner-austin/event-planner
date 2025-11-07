import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { JSDOM } from 'jsdom';

const __dirname = dirname(fileURLToPath(import.meta.url));

function loadDom(): JSDOM {
  const html = readFileSync(join(__dirname, '..', '..', 'index.html'), 'utf-8');
  return new JSDOM(html, { url: 'http://localhost/index.html' });
}

describe('html interactions', () => {
  it('site title links to #hero', () => {
    const dom = loadDom();
    const d = dom.window.document;
    const a = d.querySelector('.site-title a') as HTMLElement | null;
    expect(a).not.toBeNull();
    expect(a!.getAttribute('href')).toBe('#hero');
    expect(d.querySelector('#hero')).not.toBeNull();
  });

  it('nav link points to #login', () => {
    const dom = loadDom();
    const d = dom.window.document;
    const a = d.querySelector('.nav__link') as HTMLElement | null;
    expect(a).not.toBeNull();
    expect(a!.getAttribute('href')).toBe('#login');
    expect(d.querySelector('#login')).not.toBeNull();
  });

  it('filters exist with expected option values', () => {
    const dom = loadDom();
    const d = dom.window.document;
    const club = d.querySelector('#club-filter') as HTMLSelectElement | null;
    const date = d.querySelector('#date-filter') as HTMLSelectElement | null;
    expect(club).not.toBeNull();
    expect(date).not.toBeNull();
    const clubVals = Array.from(club!.options).map(o => o.value);
    const dateVals = Array.from(date!.options).map(o => o.value);
    expect(clubVals).toEqual(expect.arrayContaining(['all','ICSSC','WICS','AI@UCI','Hack@UCI','Design@UCI']));
    expect(dateVals).toEqual(expect.arrayContaining(['all','week','month']));
  });
});
