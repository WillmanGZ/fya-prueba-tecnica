import { Pool } from "pg";
import { loadEnv } from "./infrastructure/config/env";
import { PostgresInfoRepository } from "./infrastructure/persistence/postgres-info.repository";
import { GetServiceInfoUseCase } from "./application/get-service-info.usecase";
import { createExpressApp } from "./infrastructure/http/express-app";

const env = loadEnv();
const pool = new Pool(env.db);
const infoRepository = new PostgresInfoRepository(pool);
const getServiceInfo = new GetServiceInfoUseCase(infoRepository);

const app = createExpressApp(getServiceInfo);

app.listen(env.port, () => {
  console.log(`Listening on port ${env.port}`);
});
