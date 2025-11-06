import { describe, it, expect } from 'vitest';
import { restoreLastEvent } from '../../src/app/restore';

describe('restoreLastEvent', () => {
  it('invokes show when getLast returns non-empty string', () => {
    const calls: string[] = [];
    restoreLastEvent(() => 'e1', (id) => { calls.push(id); });
    expect(calls).toEqual(['e1']);
  });

  it('does nothing when getLast returns null or empty', () => {
    const calls: string[] = [];
    restoreLastEvent(() => null, (id) => { calls.push(id); });
    restoreLastEvent(() => '', (id) => { calls.push(id); });
    expect(calls.length).toBe(0);
  });
});

