import { describe, it, expect } from 'vitest';
import { qsStrictEl, qsStrictInput, setText, hide, show } from '../../src/util/dom';

describe('dom utils', () => {
  it('queries elements strictly and mutates classes/text', () => {
    document.body.innerHTML = `
      <div id="root">
        <input id="inp" value="x" />
        <div id="el" class="hidden"></div>
      </div>`;
    const el = qsStrictEl('#el');
    const inp = qsStrictInput('#inp');
    expect(inp.value).toBe('x');
    setText(el, 'hello');
    expect(el.textContent).toBe('hello');
    show(el);
    expect(el.classList.contains('hidden')).toBe(false);
    hide(el);
    expect(el.classList.contains('hidden')).toBe(true);
  });

  it('throws when element not found', () => {
    document.body.innerHTML = '';
    expect(() => qsStrictEl('#nope')).toThrow();
    expect(() => qsStrictInput('#nope')).toThrow();
  });
});

