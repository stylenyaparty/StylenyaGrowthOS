# Stylenya Growth OS Agent Contract

## Architecture

- Use a modular monolith with Clean/Hexagonal Architecture.
- Keep dependencies directed toward domain and application code.
- Keep frameworks in interfaces or infrastructure; domain code must not import them.
- PostgreSQL and Prisma are future persistence choices behind adapters. Prisma types must never become domain entities.

## Runtime and execution

- Primary language: TypeScript.
- Target runtime: Node.js 24 LTS.
- API framework: Fastify.
- Local execution: Docker Compose on OLOFI.
- The system is local, single-user, and agent-first.
- Nova/Codex and future MCP are the primary interaction direction.
- Do not add sophisticated frontend, authentication, roles, or user administration.

## Change discipline

- Make small, tested, reversible changes.
- Implement one feature or infrastructure concern per increment.
- Do not add dependencies without a clear justification.
- Run `npm run format:check`, `npm run lint`, `npm run typecheck`, `npm test`, and `npm run build` before declaring work complete.
- Do not push or alter Git history without explicit authorization.

## Explicit boundaries

- PostgreSQL, Prisma, MCP, internal events, Outbox, workers, and commercial features are future work unless explicitly requested.
- Future PDFs are versioned representations; PostgreSQL will be the structured source of truth and Google Drive a document archive and consultation backup.
