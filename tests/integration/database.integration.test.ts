import { afterAll, describe, expect, it } from 'vitest';
import { createPrismaDatabaseHealthAdapter } from '../../src/infrastructure/prisma/prisma-database-health-adapter.js';

const connectionString = process.env.TEST_DATABASE_URL;
if (!connectionString) {
  throw new Error('TEST_DATABASE_URL is required to run integration tests');
}

const adapter = createPrismaDatabaseHealthAdapter(connectionString, {
  warn: () => undefined,
});

afterAll(async () => {
  await adapter.disconnect();
});

describe('PostgreSQL integration', () => {
  it('connects with the test user and executes the technical health query', async () => {
    await expect(adapter.check()).resolves.toBe('up');
  });
});
