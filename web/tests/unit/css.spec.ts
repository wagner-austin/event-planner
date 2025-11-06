import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));

function readCss(filename: string): string {
  return readFileSync(join(__dirname, '..', '..', 'assets', 'css', filename), 'utf-8');
}

describe('CSS expectations', () => {
  it('site header is sticky', () => {
    const css = readCss('NewTestCSS.css');
    expect(css).toMatch(/\.site-header\s*\{[\s\S]*position:\s*sticky/i);
  });
  it('site title link keeps white color and no underline', () => {
    const css = readCss('NewTestCSS.css');
    expect(css).toMatch(/\.site-title__link\s*\{[\s\S]*color:\s*var\(--color-text\)/i);
    expect(css).toMatch(/\.site-title__link\s*\{[\s\S]*text-decoration:\s*none/i);
  });
});

