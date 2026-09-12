import type { DatabaseHealthPort } from './database-health.js';

export interface ReadinessChecker {
  check(): Promise<ReadinessResult>;
}

export interface ReadinessResult {
  readonly status: 'ready' | 'not-ready';
  readonly dependencies: Record<string, 'up' | 'down'>;
}

export function createReadinessChecker(databaseHealth: DatabaseHealthPort): ReadinessChecker {
  return {
    check: async () => {
      try {
        const database = await databaseHealth.check();
        return {
          status: database === 'up' ? 'ready' : 'not-ready',
          dependencies: { database },
        };
      } catch {
        return {
          status: 'not-ready',
          dependencies: { database: 'down' },
        };
      }
    },
  };
}
