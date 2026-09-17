import { readFileSync } from "node:fs";
import { join } from "node:path";

export interface EnvConfig {
  port: number;
  db: {
    host: string | undefined;
    port: number;
    database: string | undefined;
    user: string | undefined;
    password: string | undefined;
    ssl: { rejectUnauthorized: true; ca: string } | undefined;
  };
}

// AWS RDS CA bundle, used to verify Postgres's TLS certificate.
const RDS_CA_BUNDLE_PATH = join(__dirname, "../../../certs/rds-global-bundle.pem");

/**
 * Reads and normalizes the process environment into an {@link EnvConfig}.
 *
 * A function, not an eagerly-evaluated object — reading process.env at import
 * time makes it impossible to test different scenarios (the value is fixed
 * the moment the module first loads).
 */
export function loadEnv(): EnvConfig {
  return {
    port: Number(process.env.PORT ?? 8080),
    db: {
      host: process.env.DB_HOST,
      port: Number(process.env.DB_PORT ?? 5432),
      database: process.env.DB_NAME,
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      ssl:
        process.env.DB_SSL === "true"
          ? { rejectUnauthorized: true, ca: readFileSync(RDS_CA_BUNDLE_PATH, "utf-8") }
          : undefined,
    },
  };
}
