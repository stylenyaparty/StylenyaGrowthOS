import type { FastifyInstance } from 'fastify';
import type { SystemService } from '../../application/system-service.js';

export async function registerSystemRoutes(
  app: FastifyInstance,
  systemService: SystemService,
): Promise<void> {
  app.get(
    '/api/v1/system/version',
    {
      schema: {
        tags: ['system'],
        response: { 200: { $ref: 'VersionResponse#' } },
      },
    },
    async () => systemService.version(),
  );

  app.get(
    '/api/v1/system/status',
    {
      schema: {
        tags: ['system'],
        response: { 200: { $ref: 'StatusResponse#' } },
      },
    },
    async () => systemService.status(),
  );
}
