# Analysis Decisions

Confirmed:

- Stylenya is a local strategic engine.
- Nova/Codex is the primary interaction direction; MCP is future/not implemented.
- The system is a modular monolith with Clean/Hexagonal Architecture.
- TypeScript is the primary language and Docker Desktop runs the local environment on OLOFI.
- PostgreSQL and Prisma are implemented as technical infrastructure behind application ports.
- The Prisma infrastructure adapter performs a real PostgreSQL health check.
- Prisma remains confined to infrastructure; application code depends on its ports rather than Prisma types.
- Google Drive is a future document archive and consultation backup.
- PDFs are future versioned representations.

No business persistence model exists yet: there are no commercial models, tables, or migrations. No commercial domain or visual product interface is part of this bootstrap.
