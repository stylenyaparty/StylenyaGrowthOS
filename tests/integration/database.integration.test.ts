import { afterAll, describe, expect, it } from 'vitest';
import { PrismaPg } from '@prisma/adapter-pg';
import { Prisma, PrismaClient } from '../../src/infrastructure/prisma/generated/client.js';
import {
  createPoolConfig,
  createPrismaDatabaseHealthAdapter,
} from '../../src/infrastructure/prisma/prisma-database-health-adapter.js';

const connectionString = process.env.TEST_DATABASE_URL;
if (!connectionString) {
  throw new Error('TEST_DATABASE_URL is required to run integration tests');
}

const adapter = createPrismaDatabaseHealthAdapter(connectionString);

const timeoutClient = new PrismaClient({
  adapter: new PrismaPg(createPoolConfig(connectionString)),
});

afterAll(async () => {
  await adapter.disconnect();
  await timeoutClient.$disconnect();
});

describe('PostgreSQL integration', () => {
  it('connects with the test user and executes the technical health query', async () => {
    await expect(adapter.check()).resolves.toBe('up');
  });

  it('enforces the PostgreSQL statement timeout and recovers for a later query', async () => {
    const startedAt = performance.now();
    await expect(timeoutClient.$queryRaw(Prisma.sql`SELECT pg_sleep(2)`)).rejects.toThrow();
    const elapsedMs = performance.now() - startedAt;

    expect(elapsedMs).toBeLessThan(1_800);
    await expect(timeoutClient.$queryRaw(Prisma.sql`SELECT 1`)).resolves.toBeDefined();
    const currentUser = await timeoutClient.$queryRaw<{ current_user: string }[]>(
      Prisma.sql`SELECT current_user`,
    );
    expect(currentUser[0]?.current_user).toBe('StylenyaGrowthOS_db_test');
  });
});
