FROM node:24-alpine AS build
WORKDIR /app

# corepack ships with Node itself, no need to npm-install pnpm separately.
RUN corepack enable && corepack prepare pnpm@12.4.2 --activate

# Copied and installed before the source code so Docker's layer cache reuses this step when only application code changes, not dependencies.
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
RUN pnpm install --frozen-lockfile

COPY tsconfig.json ./
COPY src ./src
RUN pnpm run build

# Clean base, nothing from the build stage carries over unless copied explicitly.
FROM node:24-alpine AS runtime
WORKDIR /app

ENV NODE_ENV=production

RUN corepack enable && corepack prepare pnpm@12.4.2 --activate

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
# --prod skips devDependencies entirely.
RUN pnpm install --prod --frozen-lockfile

# The only thing that crosses over from the build stage: compiled JS, never the TypeScript source or the compiler itself.
COPY --from=build /app/dist ./dist

# Runs as an unprivileged user, if the process gets compromised, it can't touch anything outside what appuser explicitly owns.
RUN addgroup -S appgroup && adduser -S appuser -G appgroup
USER appuser

# ECS reads this to decide if the task is alive at all, independent of (and earlier than) the ALB target group's own HTTP health check.
HEALTHCHECK --interval=30s --timeout=5s --start-period=5s --retries=3 \
CMD wget -qO- http://localhost:8080/health || exit 1

EXPOSE 8080
CMD ["node", "dist/index.js"]