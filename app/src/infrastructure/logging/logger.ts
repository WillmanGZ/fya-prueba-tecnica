import pino from "pino";

// JSON to stdout — ECS ships stdout straight to CloudWatch Logs via the
// awslogs driver, so structured JSON is directly queryable there, unlike
// plain text. Silenced in tests so `vitest run` output stays readable.
export const logger = pino({
  level: process.env.NODE_ENV === "test" ? "silent" : (process.env.LOG_LEVEL ?? "info"),
});
