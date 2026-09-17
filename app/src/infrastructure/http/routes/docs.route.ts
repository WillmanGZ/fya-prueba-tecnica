import { readFileSync } from "node:fs";
import { join } from "node:path";
import { Router } from "express";
import swaggerUi from "swagger-ui-express";
import { parse } from "yaml";

/**
 * Serves the OpenAPI spec as interactive Swagger UI at `/docs`, and the raw
 * spec itself at `/openapi.json`. Read once at startup, not per-request —
 * the spec is a static file, not something that changes at runtime.
 */
export function createDocsRouter(): Router {
  const specPath = join(__dirname, "../../../../openapi.yaml");
  const spec: Record<string, unknown> = parse(readFileSync(specPath, "utf-8"));

  const router = Router();
  router.get("/openapi.json", (_req, res) => res.json(spec));
  router.use("/docs", swaggerUi.serve, swaggerUi.setup(spec));

  return router;
}
