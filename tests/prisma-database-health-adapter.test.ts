import { describe, expect, it, vi } from 'vitest';
import {
  createPoolConfig,
  createPrismaDatabaseHealthAdapter,
  createUnavailableDatabaseHealthPort,
  PrismaDatabaseHealthAdapter,
  type PrismaHealthClient,
} from '../src/infrastructure/prisma/prisma-database-health-adapter.js';

function createClient(
  queryRaw: PrismaHealthClient['$queryRaw'],
  disconnect: PrismaHealthClient['$disconnect'] = async () => undefined,
): PrismaHealthClient {
  return { $queryRaw: queryRaw, $disconnect: disconnect };
}

describe('PrismaDatabaseHealthAdapter', () => {
  it('deduplicates ten concurrent checks into one query', async () => {
    let resolveQuery: (() => void) | undefined;
    const query = vi.fn(
      () =>
        new Promise<void>((resolve) => {
          resolveQuery = resolve;
        }),
    );
    const adapter = new PrismaDatabaseHealthAdapter(createClient(query));

    const checks = Array.from({ length: 10 }, () => adapter.check());
    expect(query).toHaveBeenCalledTimes(1);
    resolveQuery?.();

    await expect(Promise.all(checks)).resolves.toEqual(Array(10).fill('up'));
  });

  it('returns down to all concurrent callers and recovers on the next check', async () => {
    let shouldFail = true;
    const query = vi.fn(async () => {
      if (shouldFail) {
        throw new Error('database unavailable');
      }
    });
    const adapter = new PrismaDatabaseHealthAdapter(createClient(query));

    await expect(Promise.all(Array.from({ length: 10 }, () => adapter.check()))).resolves.toEqual(
      Array(10).fill('down'),
    );
    expect(query).toHaveBeenCalledTimes(1);

    shouldFail = false;
    await expect(adapter.check()).resolves.toBe('up');
    expect(query).toHaveBeenCalledTimes(2);
  });

  it('uses real pg timeout settings for connection and query limits', () => {
    expect(createPoolConfig('postgresql://placeholder').connectionTimeoutMillis).toBe(1_000);
    expect(createPoolConfig('postgresql://placeholder').query_timeout).toBe(1_000);
    expect(createPoolConfig('postgresql://placeholder').statement_timeout).toBe(1_000);
    expect(createPoolConfig('postgresql://placeholder').idleTimeoutMillis).toBe(10_000);
    expect(createPoolConfig('postgresql://placeholder').max).toBe(2);
  });

  it('disconnects exactly once and shares concurrent disconnects', async () => {
    let resolveDisconnect: (() => void) | undefined;
    const disconnect = vi.fn(
      () =>
        new Promise<void>((resolve) => {
          resolveDisconnect = resolve;
        }),
    );
    const adapter = new PrismaDatabaseHealthAdapter(
      createClient(async () => undefined, disconnect),
    );

    const first = adapter.disconnect();
    const second = adapter.disconnect();
    expect(disconnect).toHaveBeenCalledTimes(1);
    resolveDisconnect?.();
    await expect(Promise.all([first, second])).resolves.toEqual([undefined, undefined]);
  });

  it('shares a disconnect failure and does not retry it', async () => {
    const failure = new Error('disconnect failed');
    const disconnect = vi.fn(async () => {
      throw failure;
    });
    const adapter = new PrismaDatabaseHealthAdapter(
      createClient(async () => undefined, disconnect),
    );

    const first = adapter.disconnect();
    const second = adapter.disconnect();
    await expect(first).rejects.toBe(failure);
    await expect(second).rejects.toBe(failure);
    expect(disconnect).toHaveBeenCalledTimes(1);
  });

  it('provides an unavailable port without throwing', async () => {
    const port = createUnavailableDatabaseHealthPort();

    await expect(port.check()).resolves.toBe('down');
    await expect(port.disconnect()).resolves.toBeUndefined();
  });

  it('creates a Prisma adapter without connecting eagerly', async () => {
    const adapter = createPrismaDatabaseHealthAdapter('postgresql://placeholder');

    await expect(adapter.disconnect()).resolves.toBeUndefined();
  });
});
