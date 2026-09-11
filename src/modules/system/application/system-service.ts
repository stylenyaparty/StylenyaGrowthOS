import type { AppConfig } from '../../../shared/config/env.js';
import { SERVICE_NAME, SERVICE_VERSION } from '../../../shared/config/service-info.js';
import type { ApplicationState } from '../../../shared/observability/app-state.js';

export interface SystemService {
  version(): VersionResponse;
  status(): StatusResponse;
}

export interface VersionResponse {
  service: string;
  version: string;
  environment: AppConfig['NODE_ENV'];
  nodeVersion: string;
}

export interface StatusResponse {
  service: string;
  status: 'ok';
  startedAt: string;
  uptimeSeconds: number;
  timestamp: string;
  instanceId: string;
  version: string;
  dependencies: Record<string, 'not-configured'>;
}

export function createSystemService(config: AppConfig, state: ApplicationState): SystemService {
  return {
    version: () => ({
      service: SERVICE_NAME,
      version: SERVICE_VERSION,
      environment: config.NODE_ENV,
      nodeVersion: process.version,
    }),
    status: () => ({
      service: SERVICE_NAME,
      status: 'ok',
      startedAt: state.startedAt,
      uptimeSeconds: Math.floor(process.uptime()),
      timestamp: new Date().toISOString(),
      instanceId: state.instanceId,
      version: SERVICE_VERSION,
      dependencies: {
        database: 'not-configured',
      },
    }),
  };
}
