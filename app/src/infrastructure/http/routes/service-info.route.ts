import { Router } from "express";
import type { GetServiceInfoUseCase } from "../../../application/get-service-info.usecase";
import { ok } from "../api-response";

/** Builds the router for GET /v1/info, injecting the use case it delegates to. */
export function createServiceInfoRouter(getServiceInfo: GetServiceInfoUseCase): Router {
  const router = Router();

  /**
   * GET /v1/info — database connectivity check.
   *
   * @returns 200 with `db_status: "connected"` when Postgres answers, 503
   * with `db_status: "unreachable"` otherwise. Both are `success: true` —
   * the endpoint itself didn't fail, it's reporting a fact about the database.
   */
  router.get("/v1/info", async (_req, res) => {
    const info = await getServiceInfo.execute();
    const statusCode = info.db_status === "connected" ? 200 : 503;
    res.status(statusCode).json(ok(info));
  });

  return router;
}
