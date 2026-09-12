import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient, Prisma } from './generated/client.js';
import type { PoolConfig } from 'pg';
import type {
  DatabaseLifecyclePort,
  DatabaseHealthPort,
  DatabaseStatus,
} from '../../modules/system/application/database-health.js';

const DATABASE_TIMEOUT_MS = 1_000;
const DATABASE_IDLE_TIMEOUT_MS = 10_000;
const DATABASE_POOL_MAX = 2;

export class PrismaDatabaseHealthAdapter implements DatabaseHealthPort, DatabaseLifecyclePort {
  private checkPromise: Promise<DatabaseStatus> | undefined;
  private disconnectPromise: Promise<void> | undefined;

  public constructor(private readonly client: PrismaHealthClient) {}

  public async check(): Promise<DatabaseStatus> {
    if (!this.checkPromise) {
      const checkPromise = this.runCheck();
      this.checkPromise = checkPromise.finally(() => {
        this.checkPromise = undefined;
      });
    }

    return this.checkPromise;
  }

  private async runCheck(): Promise<DatabaseStatus> {
    try {
      await this.client.$queryRaw(Prisma.sql`SELECT 1`);
      return 'up';
    } catch {
      return 'down';
    }
  }

  public disconnect(): Promise<void> {
    if (!this.disconnectPromise) {
      this.disconnectPromise = this.client.$disconnect();
    }

    return this.disconnectPromise;
  }
}

export interface PrismaHealthClient {
  $queryRaw(query: Prisma.Sql): Promise<unknown>;
  $disconnect(): Promise<void>;
}

export function createPrismaDatabaseHealthAdapter(
  connectionString: string,
): PrismaDatabaseHealthAdapter {
  const adapter = new PrismaPg(createPoolConfig(connectionString));
  const client = new PrismaClient({ adapter });
  return new PrismaDatabaseHealthAdapter(client);
}

export function createPoolConfig(connectionString: string): PoolConfig {
  return {
    connectionString,
    connectionTimeoutMillis: DATABASE_TIMEOUT_MS,
    query_timeout: DATABASE_TIMEOUT_MS,
    statement_timeout: DATABASE_TIMEOUT_MS,
    idleTimeoutMillis: DATABASE_IDLE_TIMEOUT_MS,
    max: DATABASE_POOL_MAX,
  };
}

export function createUnavailableDatabaseHealthPort(): DatabaseHealthPort & DatabaseLifecyclePort {
  return {
    check: async () => 'down',
    disconnect: async () => undefined,
  };
}
