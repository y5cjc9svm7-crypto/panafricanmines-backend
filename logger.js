import { createRequire } from 'node:module';
import pino from 'pino';
import config from '../config.js';

const require = createRequire(import.meta.url);

// Pretty logging is a developer convenience only. If `pino-pretty` is not
// installed (e.g. production installs without dev dependencies), fall back to
// structured JSON logging rather than crashing on startup.
function prettyTransport() {
  if (config.isProd) return undefined;
  try {
    require.resolve('pino-pretty');
    return { target: 'pino-pretty', options: { colorize: true, translateTime: 'HH:MM:ss' } };
  } catch {
    return undefined;
  }
}

const logger = pino({
  level: process.env.LOG_LEVEL || (config.isProd ? 'info' : 'debug'),
  transport: prettyTransport(),
});

export default logger;
