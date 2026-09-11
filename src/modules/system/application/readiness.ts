export interface ReadinessChecker {
  check(): ReadinessResult;
}

export interface ReadinessResult {
  readonly status: 'ready';
  readonly dependencies: Record<string, 'not-configured'>;
}

export function createReadinessChecker(): ReadinessChecker {
  return {
    check: () => ({
      status: 'ready',
      dependencies: {
        database: 'not-configured',
      },
    }),
  };
}
