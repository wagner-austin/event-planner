import { createApp } from './app/core.js';
import { logger } from './util/logger.js';
import { ApiClient } from './api/ApiClient.js';
import { loadConfig } from './util/config.js';
import type { Logger } from './util/logger.js';
import type { AppConfig } from './util/config.js';

export function initApp(deps?: { logger?: Logger; makeClient?: (baseUrl: string) => ApiClient; loadConfig?: () => Promise<AppConfig> }): void {
  const app = createApp(document, {
    log: deps?.logger ?? logger,
    makeClient: deps?.makeClient ?? ((base) => new ApiClient(base)),
    loadConfig: deps?.loadConfig ?? loadConfig,
  });
  void app.init();
}

// default bootstrap
initApp();
