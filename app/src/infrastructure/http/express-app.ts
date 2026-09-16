import express, { type Express, type NextFunction, type Request, type Response } from "express";
import type { GetServiceInfoUseCase } from "../../application/get-service-info.usecase";
import { healthRouter } from "./routes/health.route";
import { createServiceInfoRouter } from "./routes/service-info.route";
import { fail } from "./api-response";
import { httpLogger } from "../logging/http-logger";
import { logger } from "../logging/logger";

export function createExpressApp(getServiceInfo: GetServiceInfoUseCase): Express {
  const app = express();

  app.use(httpLogger);

  app.use(healthRouter);
  app.use(createServiceInfoRouter(getServiceInfo));

  app.use((_req, res) => {
    res.status(404).json(fail("Not found"));
  });

  // Express only treats a 4-arg function as an error handler — _next must
  // stay in the signature even though this handler never calls it.
  app.use((err: unknown, _req: Request, res: Response, _next: NextFunction) => {
    logger.error({ err }, "Unhandled error");
    res.status(500).json(fail("Internal server error"));
  });

  return app;
}
