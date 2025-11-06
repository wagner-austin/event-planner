export type LogLevel = 'info' | 'warn' | 'error';

export interface Logger {
  info: (msg: string, context?: Record<string, unknown>) => void;
  warn: (msg: string, context?: Record<string, unknown>) => void;
  error: (msg: string, context?: Record<string, unknown>) => void;
}

function log(level: LogLevel, msg: string, context?: Record<string, unknown>): void {
  const payload = { ts: new Date().toISOString(), level, msg, ...(context || {}) };
  // eslint-disable-next-line no-console
  if (level === 'error') console.error(payload); else if (level === 'warn') console.warn(payload); else console.info(payload);
}

export const logger: Logger = {
  info: (msg: string, context?: Record<string, unknown>) => log('info', msg, context),
  warn: (msg: string, context?: Record<string, unknown>) => log('warn', msg, context),
  error: (msg: string, context?: Record<string, unknown>) => log('error', msg, context),
};
