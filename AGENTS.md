# Stylenya Growth OS Agent Contract

## Architecture

- Use a modular monolith with Clean/Hexagonal Architecture.
- Keep dependencies directed toward domain and application code.
- Keep frameworks in interfaces or infrastructure; domain code must not import them.
- PostgreSQL is a real technical dependency behind adapters; Prisma 7.10.0 is confined to infrastructure. Prisma types must never become domain entities.
- `DatabaseHealthPort` exposes only health checks; `DatabaseLifecyclePort` owns disconnection.
- PostgreSQL health checks use real pg/PostgreSQL timeouts: 1 second connection, query, and statement limits, pool max 2, and 10-second idle timeout.
- Concurrent readiness checks use adapter-level single-flight; no temporary health cache is used.

## Runtime and execution

- Primary language: TypeScript.
- Target runtime: Node.js 24 LTS.
- API framework: Fastify.
- Local execution: Docker Compose on OLOFI.
- The system is local, single-user, and agent-first.
- Nova/Codex and future MCP are the primary interaction direction.
- Do not add sophisticated frontend, authentication, roles, or user administration.

## Agent workspace limitations

- StylenyaGrowthOS uses only the `main` branch locally and on GitHub.
- If an agent detects another branch, it must stop Git-mutating operations, report the inconsistency, and continue only after the authorized environment confirms that it is on `main`.
- Agents must not create, switch, delete, or publish branches without explicit instruction.
- Agents must not add or modify Git remotes.
- If the host does not provide Node.js 24, validate the target runtime with the Node.js 24 Docker image.
- The authorized local environment performs Git integration operations with `origin/main`.

## Change discipline

- Make small, tested, reversible changes.
- Implement one feature or infrastructure concern per increment.
- Do not add dependencies without a clear justification.
- Run `npm run format:check`, `npm run lint`, `npm run typecheck`, `npm test`, and `npm run build` before declaring work complete.
- Do not push or alter Git history without explicit authorization.

## Explicit boundaries

- Prisma Client connection and database health are implemented as technical infrastructure. Prisma models, PostgreSQL schemas, migrations, MCP, internal events, Outbox, workers, and commercial features are future work unless explicitly requested.
- Prisma CLI vulnerabilities are a temporary tooling risk only when absent from the production image; review official Prisma 7 updates before changing versions.
- Future PDFs are versioned representations; PostgreSQL will be the structured source of truth and Google Drive a document archive and consultation backup.
