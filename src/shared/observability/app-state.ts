import { randomUUID } from 'node:crypto';

export interface ApplicationState {
  readonly startedAt: string;
  readonly instanceId: string;
}

export function createApplicationState(): ApplicationState {
  return {
    startedAt: new Date().toISOString(),
    instanceId: randomUUID(),
  };
}
