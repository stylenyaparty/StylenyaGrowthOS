# Architecture

Stylenya Growth OS is a modular monolith using Clean/Hexagonal Architecture. Fastify stays at the HTTP interface boundary, while application services and ports remain independent of transport and persistence frameworks.

Prisma 7.10.0 is implemented exclusively as an infrastructure adapter for a real PostgreSQL health query. The application depends on `DatabaseHealthPort` and `DatabaseLifecyclePort`, not on Prisma, pg, or Fastify. No Prisma models, tables, migrations, or business repositories exist yet.

The adapter configures `connectionTimeoutMillis`, `query_timeout`, and PostgreSQL `statement_timeout` to 1000 ms, `max` to 2, and `idleTimeoutMillis` to 10000 ms. The query itself is not wrapped in a cosmetic `Promise.race`; PostgreSQL/pg enforce the timeout. Concurrent checks use single-flight and share one in-progress promise.

`/health` is liveness and does not query PostgreSQL. `/ready` is readiness and returns 200/up or 503/down based on PostgreSQL. `/api/v1/system/status` is a diagnostic endpoint and remains HTTP 200 while describing the database state. `DATABASE_URL` and `TEST_DATABASE_URL` are local secrets and are never returned or logged.

Prisma 7.10.0 is pinned deliberately for this increment. Prisma 8 will be evaluated later and is not adopted automatically.

The Prisma CLI audit findings are a temporary tooling risk only. The production image uses `npm ci --omit=dev` and does not expose the Prisma CLI; an official Prisma 7 update should be reviewed before changing versions.

With npm 11 and Prisma 7.10.0, npm materializes the optional `prisma` peer of `@prisma/client` during a normal production install. The production image therefore uses the localized workaround `npm ci --omit=dev --legacy-peer-deps`; development and build stages continue using normal npm behavior. All mandatory runtime peers are declared directly. This workaround is temporary and must be reevaluated when npm or Prisma is upgraded.

Confirmed direction: local strategic engine for Stylenya, agent-first interaction through Nova/Codex with future MCP, and a minimal visual UI.
