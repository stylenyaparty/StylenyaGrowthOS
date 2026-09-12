export type DatabaseStatus = 'up' | 'down';

export interface DatabaseHealthPort {
  check(): Promise<DatabaseStatus>;
}

export interface DatabaseLifecyclePort {
  disconnect(): Promise<void>;
}
