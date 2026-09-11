import { createApp } from './app/create-app.js';
import { loadConfig } from './shared/config/env.js';

const config = loadConfig();
const app = createApp(config);

try {
  await app.listen({ host: config.HOST, port: config.PORT });
} catch (error) {
  app.log.error(error, 'Unable to start application');
  process.exitCode = 1;
}
