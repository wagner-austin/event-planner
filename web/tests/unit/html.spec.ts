import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));

function readHtml(filename: string): string {
  const path = join(__dirname, '..', '..', filename);
  return readFileSync(path, 'utf-8');
}

describe('html page', () => {
  it('index.html has CSP and script path', () => {
    const html = readHtml('index.html');
    expect(html).toContain('Content-Security-Policy');
    expect(html).toContain('assets/js/app.js');
    expect(html).toContain('ICS Connect');
  });
});
