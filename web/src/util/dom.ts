function qsel(selector: string, root?: ParentNode): Element | null {
  return (root || document).querySelector(selector);
}

export function qsStrictEl(selector: string, root?: ParentNode): HTMLElement {
  const el = qsel(selector, root);
  if (!(el instanceof HTMLElement)) throw new Error(`Element not found: ${selector}`);
  return el;
}

export function qsStrictInput(selector: string, root?: ParentNode): HTMLInputElement {
  const el = qsel(selector, root);
  if (!(el instanceof HTMLInputElement)) throw new Error(`Input not found: ${selector}`);
  return el;
}

export function setText(el: HTMLElement, text: string): void { el.textContent = text; }
export function show(el: HTMLElement): void { el.classList.remove('hidden'); }
export function hide(el: HTMLElement): void { el.classList.add('hidden'); }

