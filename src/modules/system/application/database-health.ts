export type DatabaseStatus = 'up' | 'down';

export interface DatabaseHealthPort {
  check(): Promise<DatabaseStatus>;
  disconnect(): Promise<void>;
}
