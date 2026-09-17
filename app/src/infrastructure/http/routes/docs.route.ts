import { readFileSync } from "node:fs";
import { join } from "node:path";
import { Router } from "express";
import { parse } from "yaml";

// swagger-ui-express's own generateHTML() bakes a relative "./swagger-ui.css"
// (and friends) into its template regardless of any options passed in — it
// only ever *adds* extra tags, never replaces that hardcoded reference. That
// breaks behind API Gateway: relative paths resolve against whatever the
// browser's address bar shows, which the app never sees (API Gateway strips
// the "/api" stage prefix before forwarding). Writing the page ourselves,
// loading the UI bundle from a CDN, sidesteps the template entirely. The one
// relative reference we do keep — "./openapi.json" — is deliberate: it's a
// sibling of this route in every environment (localhost, or behind the
// stage), so relative resolution lands on our own /openapi.json regardless
// of what prefix sits in front of it.
const SWAGGER_UI_CDN = "https://cdn.jsdelivr.net/npm/swagger-ui-dist@5";

function renderDocsPage(): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <title>fya-prueba-tecnica API docs</title>
  <link rel="stylesheet" href="${SWAGGER_UI_CDN}/swagger-ui.css" />
</head>
<body>
  <div id="swagger-ui"></div>
  <script src="${SWAGGER_UI_CDN}/swagger-ui-bundle.js"></script>
  <script>
    window.onload = () => {
      window.ui = SwaggerUIBundle({ url: "./openapi.json", dom_id: "#swagger-ui" });
    };
  </script>
</body>
</html>`;
}

/**
 * Serves the OpenAPI spec as interactive Swagger UI at `/docs`, and the raw
 * spec itself at `/openapi.json`. Both are built once at startup, not per
 * request — the spec is a static file, not something that changes at runtime.
 */
export function createDocsRouter(): Router {
  const specPath = join(__dirname, "../../../../openapi.yaml");
  const spec: Record<string, unknown> = parse(readFileSync(specPath, "utf-8"));
  const docsPage = renderDocsPage();

  const router = Router();
  router.get("/openapi.json", (_req, res) => res.json(spec));
  router.get("/docs", (_req, res) => res.type("html").send(docsPage));

  return router;
}
