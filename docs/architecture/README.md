# Architecture

Stylenya Growth OS is a modular monolith using Clean/Hexagonal Architecture. Fastify stays at the HTTP interface boundary, while application services and ports remain independent of transport and persistence frameworks.

The initial API is a technical bootstrap only. PostgreSQL with Prisma adapters, internal events, an Outbox, and idempotent workers are future/not implemented.

Confirmed direction: local strategic engine for Stylenya, agent-first interaction through Nova/Codex with future MCP, and a minimal visual UI.
