import { afterEach, describe, expect, it } from 'vitest';
import { createApp } from '../src/app/create-app.js';
import { loadConfig } from '../src/shared/config/env.js';

const testConfig = loadConfig({
  NODE_ENV: 'test',
  HOST: '127.0.0.1',
  PORT: '3000',
  LOG_LEVEL: 'silent',
});

const apps = new Set<ReturnType<typeof createApp>>();

afterEach(async () => {
  await Promise.all([...apps].map((app) => app.close()));
  apps.clear();
});

function createTestApp() {
  const app = createApp(testConfig);
  apps.add(app);
  return app;
}

describe('technical API', () => {
  it('returns the health contract', async () => {
    const response = await createTestApp().inject({ method: 'GET', url: '/health' });
    const body = response.json<{ status: string; service: string; timestamp: string }>();

    expect(response.statusCode).toBe(200);
    expect(body).toMatchObject({ status: 'ok', service: 'stylenya-growth-os' });
    expect(Number.isNaN(Date.parse(body.timestamp))).toBe(false);
  });

  it('returns ready', async () => {
    const response = await createTestApp().inject({ method: 'GET', url: '/ready' });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toMatchObject({ status: 'ready' });
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
      dependencies: { database: 'not-configured' },
    });
    expect(Number.isNaN(Date.parse(body.startedAt))).toBe(false);
    expect(Number.isNaN(Date.parse(body.timestamp))).toBe(false);
    expect(body.uptimeSeconds).toBeGreaterThanOrEqual(0);
    expect(body.instanceId).toMatch(/^[0-9a-f-]{36}$/);
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
  });

  it('can be created and closed cleanly', async () => {
    const app = createTestApp();
    await app.ready();
    await expect(app.close()).resolves.toBeUndefined();
    apps.delete(app);
  });
});
