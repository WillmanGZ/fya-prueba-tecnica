FROM node:24-alpine AS build
WORKDIR /app

# Pulls whatever patched package versions Alpine's repo currently has (e.g. openssl
# CVE fixes) at build time — independent of whether the node:24-alpine tag itself
# has been refreshed upstream since the last CVE disclosure.
RUN apk update && apk upgrade --no-cache

# corepack ships with Node itself, no need to npm-install pnpm separately.
RUN corepack enable && corepack prepare pnpm@12.4.2 --activate

# Copied and installed before the source code so Docker's layer cache reuses this step when only application code changes, not dependencies.
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
RUN pnpm install --frozen-lockfile

COPY tsconfig.json ./
COPY src ./src
RUN pnpm run build

# RDS CA bundle, used to verify Postgres's TLS certificate.
RUN apk add --no-cache curl && \
    mkdir certs && \
    curl -fsSL -o certs/rds-global-bundle.pem https://truststore.pki.rds.amazonaws.com/global/global-bundle.pem

# Clean base, nothing from the build stage carries over unless copied explicitly.
FROM node:24-alpine AS runtime
WORKDIR /app

ENV NODE_ENV=production

# Same reasoning as the build stage — this is the layer that actually ships to ECR/ECS.
RUN apk update && apk upgrade --no-cache

RUN corepack enable && corepack prepare pnpm@12.4.2 --activate

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
# --prod skips devDependencies entirely.
RUN pnpm install --prod --frozen-lockfile

# The only thing that crosses over from the build stage: compiled JS, never the TypeScript source or the compiler itself.
# openapi.yaml is intentionally not copied here — /docs is dev-only (NODE_ENV=production disables it), so the image never reads it.
COPY --from=build /app/dist ./dist
COPY --from=build /app/certs ./certs

# Runs as an unprivileged user, if the process gets compromised, it can't touch anything outside what appuser explicitly owns.
RUN addgroup -S appgroup && adduser -S appuser -G appgroup
USER appuser

# ECS reads this to decide if the task is alive at all, independent of (and earlier than) the ALB target group's own HTTP health check.
HEALTHCHECK --interval=30s --timeout=5s --start-period=5s --retries=3 \
CMD wget -qO- http://localhost:8080/api/health || exit 1

EXPOSE 8080
CMD ["node", "dist/index.js"]