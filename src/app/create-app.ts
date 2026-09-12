import Fastify, { type FastifyInstance } from 'fastify';
import swagger from '@fastify/swagger';
import swaggerUi from '@fastify/swagger-ui';
import type { AppConfig } from '../shared/config/env.js';
import { registerCorrelation } from '../shared/observability/correlation.js';
import { createApplicationState } from '../shared/observability/app-state.js';
import { createReadinessChecker } from '../modules/system/application/readiness.js';
import { createSystemService } from '../modules/system/application/system-service.js';
import type { DatabaseHealthPort } from '../modules/system/application/database-health.js';
import { registerSystemRoutes } from '../modules/system/interfaces/http/system-routes.js';
import { SERVICE_NAME, SERVICE_VERSION } from '../shared/config/service-info.js';

export function createApp(config: AppConfig, databaseHealth: DatabaseHealthPort): FastifyInstance {
  const app = Fastify({ logger: { level: config.LOG_LEVEL } });
  const state = createApplicationState();
  const readinessChecker = createReadinessChecker(databaseHealth);
  const systemService = createSystemService(config, state, databaseHealth);
  let disconnectPromise: Promise<void> | undefined;

  app.addSchema({
    $id: 'VersionResponse',
    type: 'object',
    required: ['service', 'version', 'environment', 'nodeVersion'],
    properties: {
      service: { type: 'string' },
      version: { type: 'string' },
      environment: { type: 'string' },
      nodeVersion: { type: 'string' },
    },
  });
  app.addSchema({
    $id: 'StatusResponse',
    type: 'object',
    required: [
      'service',
      'status',
      'startedAt',
      'uptimeSeconds',
      'timestamp',
      'instanceId',
      'version',
      'dependencies',
    ],
    properties: {
      service: { type: 'string' },
      status: { type: 'string' },
      startedAt: { type: 'string', format: 'date-time' },
      uptimeSeconds: { type: 'integer' },
      timestamp: { type: 'string', format: 'date-time' },
      instanceId: { type: 'string' },
      version: { type: 'string' },
      dependencies: { type: 'object', additionalProperties: { enum: ['up', 'down'] } },
    },
  });

  void app.register(swagger, {
    openapi: {
      info: { title: SERVICE_NAME, version: SERVICE_VERSION },
      tags: [{ name: 'system', description: 'Technical system endpoints' }],
    },
  });
  void app.register(swaggerUi, { routePrefix: '/docs' });
  registerCorrelation(app);

  app.get('/health', { schema: { tags: ['system'] } }, async () => ({
    status: 'ok',
    service: SERVICE_NAME,
    timestamp: new Date().toISOString(),
  }));
  app.get('/ready', { schema: { tags: ['system'] } }, async (_request, reply) => {
    const result = await readinessChecker.check();
    return reply.code(result.status === 'ready' ? 200 : 503).send(result);
  });
  void registerSystemRoutes(app, systemService);
  app.addHook('onClose', async () => {
    if (!disconnectPromise) {
      disconnectPromise = databaseHealth.disconnect();
    }
    await disconnectPromise;
  });

  app.setNotFoundHandler(async (request, reply) => {
    return reply.code(404).send({
      error: 'Not Found',
      message: `Route ${request.method} ${request.url} not found`,
      statusCode: 404,
      correlationId: request.correlationId,
    });
  });
  app.setErrorHandler(async (error, request, reply) => {
    request.log.error({ err: error }, 'Unhandled request error');
    const errorDetails = error instanceof Error ? error : new Error('Unknown request error');
    const statusCodeValue =
      typeof error === 'object' &&
      error !== null &&
      'statusCode' in error &&
      typeof error.statusCode === 'number'
        ? error.statusCode
        : 500;
    const statusCode = statusCodeValue >= 400 && statusCodeValue < 500 ? statusCodeValue : 500;
    return reply.code(statusCode).send({
      error: statusCode === 500 ? 'Internal Server Error' : errorDetails.name,
      message: statusCode === 500 ? 'An unexpected error occurred' : errorDetails.message,
      statusCode,
      correlationId: request.correlationId,
    });
  });

  return app;
}
