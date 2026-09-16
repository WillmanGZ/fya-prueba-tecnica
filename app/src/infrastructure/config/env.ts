export interface EnvConfig {
  port: number;
  db: {
    host: string | undefined;
    port: number;
    database: string | undefined;
    user: string | undefined;
    password: string | undefined;
    ssl: { rejectUnauthorized: false } | undefined;
  };
}

// A function, not an eagerly-evaluated object — reading process.env at import
// time makes it impossible to test different scenarios (the value is fixed
// the moment the module first loads).
export function loadEnv(): EnvConfig {
  return {
    port: Number(process.env.PORT ?? 8080),
    db: {
      host: process.env.DB_HOST,
      port: Number(process.env.DB_PORT ?? 5432),
      database: process.env.DB_NAME,
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      ssl: process.env.DB_SSL === "true" ? { rejectUnauthorized: false } : undefined,
    },
  };
}
