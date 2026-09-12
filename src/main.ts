import { createApp } from './app/create-app.js';
import { loadConfig } from './shared/config/env.js';
import { fileURLToPath } from 'node:url';
import {
  createPrismaDatabaseHealthAdapter,
  createUnavailableDatabaseHealthPort,
} from './infrastructure/prisma/prisma-database-health-adapter.js';

type ShutdownSignal = 'SIGINT' | 'SIGTERM';

export interface ShutdownDependencies {
  readonly app: {
    close(): Promise<unknown>;
    log: {
      info(data: object, message: string): void;
      error(data: object, message: string): void;
    };
  };
  readonly signalSource: {
    on(signal: ShutdownSignal, listener: () => void): unknown;
  };
  readonly setExitCode: (code: number) => void;
}

export function registerShutdownHandlers({
  app,
  signalSource,
  setExitCode,
}: ShutdownDependencies): void {
  let shutdownPromise: Promise<void> | undefined;

  const shutdown = (signal: ShutdownSignal): Promise<void> => {
    if (shutdownPromise) {
      return shutdownPromise;
    }

    shutdownPromise = (async () => {
      app.log.info({ signal }, 'Shutdown started');
      try {
        await app.close();
        app.log.info({ signal }, 'Shutdown completed');
      } catch (error) {
        app.log.error({ err: error, signal }, 'Shutdown failed');
        setExitCode(1);
      }
    })();

    return shutdownPromise;
  };

  signalSource.on('SIGINT', () => void shutdown('SIGINT'));
  signalSource.on('SIGTERM', () => void shutdown('SIGTERM'));
}

async function start(): Promise<void> {
  const config = loadConfig();
  let database = createUnavailableDatabaseHealthPort();
  let databaseInitializationFailed = false;

  try {
    database = createPrismaDatabaseHealthAdapter(config.DATABASE_URL, {
      warn: () => undefined,
    });
  } catch {
    databaseInitializationFailed = true;
  }

  const app = createApp(config, database);
  if (databaseInitializationFailed) {
    app.log.error(
      { component: 'database', error: 'initialization_failed' },
      'Database adapter initialization failed',
    );
  }

  registerShutdownHandlers({
    app,
    signalSource: process,
    setExitCode: (code) => {
      process.exitCode = code;
    },
  });

  try {
    await app.listen({ host: config.HOST, port: config.PORT });
  } catch (error) {
    app.log.error({ err: error }, 'Unable to start application');
    process.exitCode = 1;
  }
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  await start();
}
