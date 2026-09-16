import pinoHttp from "pino-http";
import { logger } from "./logger";

// One structured log line per request (method, path, status, duration) —
// no need to log each route by hand.
export const httpLogger = pinoHttp({ logger });
