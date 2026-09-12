# Architecture

Stylenya Growth OS is a modular monolith using Clean/Hexagonal Architecture. Fastify stays at the HTTP interface boundary, while application services and ports remain independent of transport and persistence frameworks.

Prisma 7.10.0 is implemented exclusively as an infrastructure adapter for a real PostgreSQL health query. The application depends on `DatabaseHealthPort`, not on Prisma, pg, or Fastify. No Prisma models, tables, migrations, or business repositories exist yet.

`/health` is liveness and does not query PostgreSQL. `/ready` is readiness and returns 200/up or 503/down based on PostgreSQL. `/api/v1/system/status` is a diagnostic endpoint and remains HTTP 200 while describing the database state. `DATABASE_URL` and `TEST_DATABASE_URL` are local secrets and are never returned or logged.

Prisma 7.10.0 is pinned deliberately for this increment. Prisma 8 will be evaluated later and is not adopted automatically.

Confirmed direction: local strategic engine for Stylenya, agent-first interaction through Nova/Codex with future MCP, and a minimal visual UI.
