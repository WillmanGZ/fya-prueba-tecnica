import { describe, expect, it } from "vitest";
import type { Pool, QueryResult } from "pg";
import { PostgresInfoRepository } from "./postgres-info.repository";
import { InfoUnavailableError } from "../../domain/errors/info-unavailable.error";

function fakePool(query: Pool["query"]): Pool {
  return { query } as unknown as Pool;
}

describe("PostgresInfoRepository", () => {
  it("returns the timestamp from the query result", async () => {
    const now = new Date("2026-01-01T00:00:00.000Z");
    const pool = fakePool(async () => ({ rows: [{ now }] }) as unknown as QueryResult);

    const repository = new PostgresInfoRepository(pool);

    await expect(repository.now()).resolves.toEqual(now);
  });

  it("wraps query failures in InfoUnavailableError", async () => {
    const pool = fakePool(async () => {
      throw new Error("connection refused");
    });

    const repository = new PostgresInfoRepository(pool);

    await expect(repository.now()).rejects.toThrow(InfoUnavailableError);
  });
});
