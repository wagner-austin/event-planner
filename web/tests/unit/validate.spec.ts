import { describe, it, expect } from 'vitest';
import { isUciEmail } from '../../src/util/validate';

describe('isUciEmail', () => {
  it('accepts @uci.edu and rejects others', () => {
    expect(isUciEmail('alice@uci.edu')).toBe(true);
    expect(isUciEmail('ALICE@UCI.EDU')).toBe(true);
    expect(isUciEmail('alice@example.com')).toBe(false);
    expect(isUciEmail('alice@uci.edu.evil')).toBe(false);
    expect(isUciEmail('not-an-email')).toBe(false);
    expect(isUciEmail('')).toBe(false);
  });
});

