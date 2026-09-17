import { Pool } from "pg";
import type { InfoRepository } from "../../domain/ports/info-repository.port";
import { InfoUnavailableError } from "../../domain/errors/info-unavailable.error";
import { logger } from "../logging/logger";

/** {@link InfoRepository} backed by a real `pg.Pool` connection to PostgreSQL. */
export class PostgresInfoRepository implements InfoRepository {
  constructor(private readonly pool: Pool) {}

  /**
   * @returns the database's current time via `SELECT NOW()`.
   * @throws {InfoUnavailableError} wrapping the original `pg` error if the query fails.
   */
  async now(): Promise<Date> {
    try {
      const result = await this.pool.query<{ now: Date }>("SELECT NOW()");
      return result.rows[0].now;
    } catch (err) {
      logger.error({ err }, "Postgres query failed");
      throw new InfoUnavailableError(err);
    }
  }
}
