import { Pool } from "pg";
import { loadEnv } from "./infrastructure/config/env";
import { PostgresInfoRepository } from "./infrastructure/persistence/postgres-info.repository";
import { GetServiceInfoUseCase } from "./application/get-service-info.usecase";
import { createExpressApp } from "./infrastructure/http/express-app";
import { logger } from "./infrastructure/logging/logger";

const env = loadEnv();
const pool = new Pool(env.db);

pool.on("error", (err) => {
  logger.error({ err }, "Postgres pool error");
});

const infoRepository = new PostgresInfoRepository(pool);
const getServiceInfo = new GetServiceInfoUseCase(infoRepository);

const app = createExpressApp(getServiceInfo);

const server = app.listen(env.port, () => {
  logger.info({ port: env.port }, "Server started");
});

// Closes the server and pool before exiting on SIGTERM/SIGINT.
function shutdown(signal: string): void {
  logger.info({ signal }, "Shutting down");
  server.close(() => {
    pool.end().finally(() => process.exit(0));
  });
}

process.on("SIGTERM", () => shutdown("SIGTERM"));
process.on("SIGINT", () => shutdown("SIGINT"));
