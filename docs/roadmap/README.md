# Roadmap

## Implemented in Bootstrap 2A

- Prisma 7.10.0 Client generated in infrastructure.
- Real PostgreSQL `SELECT 1` health checks through an application port and infrastructure adapter.
- Liveness, readiness, diagnostic database state, and idempotent Prisma disconnection.
- `DATABASE_URL` and `TEST_DATABASE_URL` as local-only connection contracts.

## Future, not implemented

- PostgreSQL business schema, Prisma models, and migrations.
- Internal events and a PostgreSQL Outbox.
- Idempotent workers.
- MCP integration for agent workflows.
- Versioned PDF representations and Google Drive archival.
- Business modules for trends, planning, products, campaigns, and documents.
- Any authentication, roles, user administration, or sophisticated frontend.

The current increment is limited to the executable TypeScript technical bootstrap and technical endpoints.
