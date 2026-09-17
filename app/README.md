# App — technical details

This document covers the implementation details of the microservice itself. For the overall AWS architecture, deployment instructions, and evaluation data, see the [root README](../README.md).

## Stack

- **Node.js 24 + TypeScript**, compiled with `tsc` (no bundler — the output is plain CommonJS/ESM Node code).
- **Express** for the HTTP layer.
- **pg** (node-postgres) for the PostgreSQL connection.
- **Vitest + Supertest** for testing.
- **pino / pino-http** for structured JSON logging.
- **helmet** for HTTP security headers.
- **pnpm 12** as package manager (workspace-based supply-chain config, see below).

## Architecture: hexagonal (ports & adapters)

```
src/
├── domain/                        # Core business rules, no framework dependencies
│   ├── ports/
│   │   └── info-repository.port.ts    # Interface the application layer depends on
│   └── errors/
│       └── info-unavailable.error.ts
├── application/                   # Use cases — orchestrate domain + ports
│   ├── get-service-info.usecase.ts
│   └── dto/
│       ├── health.dto.ts
│       └── service-info.dto.ts
├── infrastructure/                 # Concrete implementations (the "outside world")
│   ├── config/
│   │   └── env.ts                     # Reads and validates process.env
│   ├── http/
│   │   ├── express-app.ts
│   │   ├── api-response.ts            # ok()/fail() response envelope
│   │   └── routes/
│   │       ├── health.route.ts        # GET /health
│   │       ├── service-info.route.ts  # GET /api/v1/info
│   │       └── docs.route.ts          # GET /docs, /openapi.json — dev-only, see below
│   ├── persistence/
│   │   └── postgres-info.repository.ts # Implements InfoRepository against pg.Pool
│   └── logging/
│       ├── logger.ts
│       └── http-logger.ts
└── index.ts                        # Composition root: wires everything together
```

The rule: `domain/` and `application/` never import from `infrastructure/`. `infrastructure/` implements the ports that `domain/` defines. This means the use case (`get-service-info.usecase.ts`) is tested without a real database — it only depends on the `InfoRepository` interface, not on `pg`.

## Endpoints

| Method | Path | Purpose |
|---|---|---|
| `GET` | `/health` | Liveness check, `200` with a static JSON body. Used by the ALB target group and the Docker `HEALTHCHECK`. |
| `GET` | `/api/v1/info` | Queries Postgres (`SELECT NOW()`) and reports `db_status: "connected" \| "unreachable"` plus `db_time`. Proves the full `app → Postgres` chain works, not just that the process is alive. |
| `GET` | `/docs` | Interactive Swagger UI, generated from [`openapi.yaml`](./openapi.yaml). **Dev-only** — see below. |
| `GET` | `/openapi.json` | The raw OpenAPI spec. **Dev-only** — see below. |

Both application endpoints are wrapped in the same envelope (`api-response.ts`): `{ success: boolean, data?: ..., error?: ... }`.

## Robustness

- `helmet()` on every response (HSTS, `X-Content-Type-Options`, drops `X-Powered-By`, etc).
- Graceful shutdown on `SIGTERM`/`SIGINT`: closes the HTTP server before exiting so in-flight requests finish, then closes the Postgres pool.
- `pool.on("error", ...)`: logs idle-client pool errors instead of crashing the process.
- `Authorization`/`Cookie` headers redacted in the HTTP access logs.

## API documentation

The API contract lives as code in [`openapi.yaml`](./openapi.yaml) (OpenAPI 3.0), served interactively at `/docs` (see [`docs.route.ts`](./src/infrastructure/http/routes/docs.route.ts)) — built once at startup, not regenerated per request.

`/docs` and `/openapi.json` are **not public**: [`express-app.ts`](./src/infrastructure/http/express-app.ts) only mounts them when `NODE_ENV !== "production"`. The Docker image sets `NODE_ENV=production`, so neither the real AWS deployment nor `docker compose up` ever expose them — they only exist when running `pnpm run dev` on a developer's own machine.

The exported functions, classes, and interfaces across `domain/`, `application/`, and `infrastructure/` also carry JSDoc/TSDoc comments describing their contracts (return values, thrown errors), so IDEs surface them on hover without needing to open the source file.

## Environment variables

Read and validated in [`src/infrastructure/config/env.ts`](./src/infrastructure/config/env.ts):

| Variable | Default | Purpose |
|---|---|---|
| `PORT` | `8080` | HTTP port the server listens on. |
| `DB_HOST` | — | Postgres host. |
| `DB_PORT` | `5432` | Postgres port. |
| `DB_NAME` | — | Database name. |
| `DB_USER` | — | Database user. |
| `DB_PASSWORD` | — | Database password. |
| `DB_SSL` | unset (no SSL) | Set to `"true"` to connect over TLS with the certificate verified against AWS's RDS CA bundle (`rejectUnauthorized: true`). Required against RDS, whose default parameter group has `rds.force_ssl = 1` — without this, the connection fails with `no pg_hba.conf entry ... no encryption`. |

See [`.env.example`](../.env.example) at the repo root for local defaults.

## Scripts

```bash
pnpm run dev          # ts-node, no build step, for local iteration
pnpm run build        # tsc -> dist/
pnpm run start        # node dist/index.js (what the Docker image runs)
pnpm run test         # vitest run
pnpm run lint         # eslint .
pnpm run lint:fix
pnpm run format       # prettier --write
pnpm run format:check
```

## Testing

Every layer is tested in isolation:

- `get-service-info.usecase.test.ts` — the use case against a fake `InfoRepository`, no real database.
- `postgres-info.repository.test.ts` — the repository against a mocked `pg.Pool`.
- `env.test.ts` — env parsing, including the `DB_SSL` on/off branches.
- `express-app.test.ts` — HTTP layer with Supertest, hitting the real routes.
- `api-response.test.ts` — the response envelope helpers.

```bash
pnpm run test
```

## Docker image

Multi-stage build ([`Dockerfile`](./Dockerfile)):

1. **`build` stage**: installs all dependencies (including dev), compiles TypeScript to `dist/`.
2. **`runtime` stage**: starts from a clean `node:24-alpine`, installs only production dependencies (`pnpm install --prod`), and copies over just `dist/` — the TypeScript source and compiler never reach the final image.

Other decisions baked into the image:
- Runs as a **non-root user** (`appuser`), not the container default `root`.
- Has a Docker-level `HEALTHCHECK` hitting `/health` — this is what ECS itself checks to decide if the task is alive, independent of (and earlier than) the ALB target group's own health check.
- `pnpm-workspace.yaml` at the repo root controls pnpm 12's supply-chain policy (`minimumReleaseAge`, `allowBuilds`) — both build and runtime stages need it copied alongside `package.json`/`pnpm-lock.yaml`, or `pnpm install` fails with a lockfile-config mismatch.
- The `build` stage downloads AWS's RDS CA bundle (`curl`, discarded with the rest of that stage) and copies just the resulting file into `runtime` — it's never committed to the repo, only baked into the image.

## Running only the app (without the full docker-compose stack)

```bash
cd app
pnpm install
cp ../.env.example .env
pnpm run dev
```

Requires a reachable Postgres instance matching the `.env` values — for the full local stack (app + Postgres together), use `docker compose up` from the repo root as documented in the [root README](../README.md#running-locally).
