import { Router } from "express";
import type { HealthDto } from "../../../application/dto/health.dto";
import { ok } from "../api-response";

export const healthRouter = Router();

/**
 * GET /api/health — liveness check.
 *
 * Must never touch the database: a slow/down Postgres would otherwise make
 * the ALB target group mark this task unhealthy and kill it for no reason.
 *
 * @returns 200 with `{ status: "ok", timestamp }`.
 */
healthRouter.get("/api/health", (_req, res) => {
  res.status(200).json(ok<HealthDto>({ status: "ok", timestamp: new Date().toISOString() }));
});
