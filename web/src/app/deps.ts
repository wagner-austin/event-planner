import type { AppConfig } from '../util/config.js';
import type { ApiClient } from '../api/ApiClient.js';
import type { Logger } from '../util/logger.js';

export interface AppDeps {
  loadConfig: () => Promise<AppConfig>;
  makeClient: (baseUrl: string) => ApiClient;
  log: Logger;
}

