import { Pool } from "pg";
import type { InfoRepository } from "../../domain/ports/info-repository.port";
import { InfoUnavailableError } from "../../domain/errors/info-unavailable.error";

export class PostgresInfoRepository implements InfoRepository {
  constructor(private readonly pool: Pool) {}

  async now(): Promise<Date> {
    try {
      const result = await this.pool.query<{ now: Date }>("SELECT NOW()");
      return result.rows[0].now;
    } catch (err) {
      throw new InfoUnavailableError(err);
    }
  }
}
