import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient, Prisma } from './generated/client.js';
import type {
  DatabaseHealthPort,
  DatabaseStatus,
} from '../../modules/system/application/database-health.js';

const HEALTHCHECK_TIMEOUT_MS = 1_000;

export interface DatabaseHealthLogger {
  warn(data: object, message: string): void;
}

export class PrismaDatabaseHealthAdapter implements DatabaseHealthPort {
  private disconnectPromise: Promise<void> | undefined;

  public constructor(
    private readonly client: PrismaClient,
    private readonly logger: DatabaseHealthLogger,
    private readonly timeoutMs = HEALTHCHECK_TIMEOUT_MS,
  ) {}

  public async check(): Promise<DatabaseStatus> {
    let timeout: NodeJS.Timeout | undefined;
    const timeoutPromise = new Promise<never>((_, reject) => {
      timeout = setTimeout(
        () => reject(new Error('database health check timed out')),
        this.timeoutMs,
      );
    });

    try {
      await Promise.race([this.client.$queryRaw(Prisma.sql`SELECT 1`), timeoutPromise]);
      return 'up';
    } catch {
      this.logger.warn(
        { component: 'database', check: 'health', result: 'down' },
        'Database health check failed',
      );
      return 'down';
    } finally {
      if (timeout) {
        clearTimeout(timeout);
      }
    }
  }

  public disconnect(): Promise<void> {
    if (!this.disconnectPromise) {
      this.disconnectPromise = this.client.$disconnect();
    }

    return this.disconnectPromise;
  }
}

export function createPrismaDatabaseHealthAdapter(
  connectionString: string,
  logger: DatabaseHealthLogger,
): PrismaDatabaseHealthAdapter {
  const adapter = new PrismaPg({ connectionString });
  const client = new PrismaClient({ adapter });
  return new PrismaDatabaseHealthAdapter(client, logger);
}

export function createUnavailableDatabaseHealthPort(): DatabaseHealthPort {
  return {
    check: async () => 'down',
    disconnect: async () => undefined,
  };
}
