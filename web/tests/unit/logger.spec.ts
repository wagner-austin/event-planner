import { describe, it, expect, vi, beforeEach, afterEach, afterAll } from 'vitest';
import { logger } from '../../src/util/logger';

describe('logger', () => {
  const infoSpy = vi.spyOn(console, 'info').mockImplementation(() => {});
  const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
  const errSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
  afterEach(() => {
    infoSpy.mockClear(); warnSpy.mockClear(); errSpy.mockClear();
  });
  afterAll(() => {
    infoSpy.mockRestore(); warnSpy.mockRestore(); errSpy.mockRestore();
  });

  it('logs at all levels', () => {
    logger.info('i', { a: 1 });
    logger.warn('w');
    logger.error('e', { x: true });
    expect(infoSpy).toHaveBeenCalledOnce();
    expect(warnSpy).toHaveBeenCalledOnce();
    expect(errSpy).toHaveBeenCalledOnce();
  });
});
