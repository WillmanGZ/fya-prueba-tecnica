import { Router } from "express";
import type { GetServiceInfoUseCase } from "../../../application/get-service-info.usecase";
import { ok } from "../api-response";

export function createServiceInfoRouter(getServiceInfo: GetServiceInfoUseCase): Router {
  const router = Router();

  router.get("/api/v1/info", async (_req, res) => {
    const info = await getServiceInfo.execute();
    const statusCode = info.db_status === "connected" ? 200 : 503;
    res.status(statusCode).json(ok(info));
  });

  return router;
}
