import { afterEach, describe, expect, it } from 'vitest';
import { createApp } from '../src/app/create-app.js';
import { registerShutdownHandlers } from '../src/main.js';
import { loadConfig } from '../src/shared/config/env.js';
import type {
  DatabaseHealthPort,
  DatabaseStatus,
} from '../src/modules/system/application/database-health.js';

const testConfig = loadConfig({
  NODE_ENV: 'test',
  HOST: '127.0.0.1',
  PORT: '3000',
  LOG_LEVEL: 'silent',
  DATABASE_URL: 'postgresql://user:password@localhost:5432/stylenyagrowthos?schema=public',
});

const apps = new Set<ReturnType<typeof createApp>>();

afterEach(async () => {
  await Promise.all([...apps].map((app) => app.close()));
  apps.clear();
});

function createDatabaseHealth(status: DatabaseStatus = 'up'): DatabaseHealthPort {
  return {
    check: async () => status,
    disconnect: async () => undefined,
  };
}

function createTestApp(databaseHealth = createDatabaseHealth()) {
  const app = createApp(testConfig, databaseHealth);
  apps.add(app);
  return app;
}

describe('technical API', () => {
  it('returns the health contract', async () => {
    let checks = 0;
    const response = await createTestApp({
      check: async () => {
        checks += 1;
        return 'up';
      },
      disconnect: async () => undefined,
    }).inject({ method: 'GET', url: '/health' });
    const body = response.json<{ status: string; service: string; timestamp: string }>();

    expect(response.statusCode).toBe(200);
    expect(body).toMatchObject({ status: 'ok', service: 'stylenya-growth-os' });
    expect(Number.isNaN(Date.parse(body.timestamp))).toBe(false);
    expect(checks).toBe(0);
  });

  it('returns ready when the database is available', async () => {
    const response = await createTestApp().inject({ method: 'GET', url: '/ready' });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toMatchObject({ status: 'ready', dependencies: { database: 'up' } });
  });

  it('returns not-ready when the database is unavailable', async () => {
    const response = await createTestApp(createDatabaseHealth('down')).inject({
      method: 'GET',
      url: '/ready',
    });

    expect(response.statusCode).toBe(503);
    expect(response.json()).toMatchObject({
      status: 'not-ready',
      dependencies: { database: 'down' },
    });
  });

  it('returns the service version', async () => {
    const response = await createTestApp().inject({ method: 'GET', url: '/api/v1/system/version' });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toMatchObject({
      service: 'stylenya-growth-os',
      version: '0.1.0',
      environment: 'test',
    });
    expect(response.json().nodeVersion).toMatch(/^v\d+\.\d+\.\d+$/);
  });

  it('returns valid system status fields', async () => {
    const response = await createTestApp().inject({ method: 'GET', url: '/api/v1/system/status' });
    const body = response.json();

    expect(response.statusCode).toBe(200);
    expect(body).toMatchObject({
      service: 'stylenya-growth-os',
      status: 'ok',
      version: '0.1.0',
      dependencies: { database: 'up' },
    });
    expect(Number.isNaN(Date.parse(body.startedAt))).toBe(false);
    expect(Number.isNaN(Date.parse(body.timestamp))).toBe(false);
    expect(body.uptimeSeconds).toBeGreaterThanOrEqual(0);
    expect(body.instanceId).toMatch(/^[0-9a-f-]{36}$/);
  });

  it('reports database down in system status without exposing internal errors', async () => {
    const response = await createTestApp(createDatabaseHealth('down')).inject({
      method: 'GET',
      url: '/api/v1/system/status',
    });
    const body = response.json();

    expect(response.statusCode).toBe(200);
    expect(body.dependencies).toEqual({ database: 'down' });
    expect(JSON.stringify(body)).not.toContain('password');
    expect(JSON.stringify(body)).not.toContain('postgresql://');
  });

  it('preserves a received correlation ID', async () => {
    const response = await createTestApp().inject({
      method: 'GET',
      url: '/health',
      headers: { 'x-correlation-id': 'test-correlation-id' },
    });

    expect(response.headers['x-correlation-id']).toBe('test-correlation-id');
  });

  it('generates a correlation ID when one is absent', async () => {
    const response = await createTestApp().inject({ method: 'GET', url: '/health' });

    expect(response.headers['x-correlation-id']).toMatch(/^[0-9a-f-]{36}$/);
  });

  it('returns a consistent not found error', async () => {
    const response = await createTestApp().inject({ method: 'GET', url: '/missing' });
    const body = response.json();

    expect(response.statusCode).toBe(404);
    expect(body).toMatchObject({ error: 'Not Found', statusCode: 404 });
    expect(body.correlationId).toBe(response.headers['x-correlation-id']);
  });

  it('fails when configuration is invalid', () => {
    expect(() => loadConfig({ PORT: 'not-a-port' })).toThrow();
    expect(() => loadConfig({ DATABASE_URL: 'not-a-database-url' })).toThrow();
    expect(() => loadConfig({})).toThrow();
  });

  it('does not expose DATABASE_URL or its password in responses', async () => {
    const response = await createTestApp().inject({ method: 'GET', url: '/api/v1/system/status' });
    const serialized = response.body;

    expect(serialized).not.toContain('postgresql://');
    expect(serialized).not.toContain('password');
  });

  it('disconnects the database exactly once when Fastify closes', async () => {
    let disconnectCalls = 0;
    const app = createTestApp({
      check: async () => 'up',
      disconnect: async () => {
        disconnectCalls += 1;
      },
    });

    await app.ready();
    await app.close();
    await app.close();
    apps.delete(app);

    expect(disconnectCalls).toBe(1);
  });

  it('can be created and closed cleanly', async () => {
    const app = createTestApp();
    await app.ready();
    await expect(app.close()).resolves.toBeUndefined();
    apps.delete(app);
  });

  it('closes the app once when SIGINT and SIGTERM arrive together', async () => {
    const listeners = new Map<'SIGINT' | 'SIGTERM', () => void>();
    let closeCalls = 0;
    const logs: string[] = [];
    const app = {
      close: async () => {
        closeCalls += 1;
      },
      log: {
        info: (_data: object, message: string) => logs.push(message),
        error: (_data: object, message: string) => logs.push(message),
      },
    };

    registerShutdownHandlers({
      app,
      signalSource: { on: (signal, listener) => listeners.set(signal, listener) },
      setExitCode: () => undefined,
    });

    listeners.get('SIGINT')?.();
    listeners.get('SIGTERM')?.();
    await Promise.resolve();

    expect(closeCalls).toBe(1);
    expect(logs).toEqual(['Shutdown started', 'Shutdown completed']);
  });

  it('records shutdown failures and sets the exit code', async () => {
    let exitCode = 0;
    const logs: string[] = [];
    const app = {
      close: async () => {
        throw new Error('close failed');
      },
      log: {
        info: (_data: object, message: string) => logs.push(message),
        error: (_data: object, message: string) => logs.push(message),
      },
    };

    registerShutdownHandlers({
      app,
      signalSource: {
        on: (_signal, listener) => {
          if (_signal === 'SIGTERM') {
            listener();
          }
        },
      },
      setExitCode: (code) => {
        exitCode = code;
      },
    });
    await Promise.resolve();

    expect(exitCode).toBe(1);
    expect(logs).toEqual(['Shutdown started', 'Shutdown failed']);
  });
});
