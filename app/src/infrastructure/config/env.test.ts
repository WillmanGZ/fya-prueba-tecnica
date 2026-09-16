import { afterEach, describe, expect, it } from "vitest";
import { loadEnv } from "./env";

describe("loadEnv", () => {
  const originalEnv = { ...process.env };

  afterEach(() => {
    process.env = { ...originalEnv };
  });

  it("falls back to sane defaults when nothing is set", () => {
    delete process.env.PORT;
    delete process.env.DB_PORT;

    const env = loadEnv();

    expect(env.port).toBe(8080);
    expect(env.db.port).toBe(5432);
  });

  it("reads values from process.env when present", () => {
    process.env.PORT = "3000";
    process.env.DB_HOST = "db.internal";

    const env = loadEnv();

    expect(env.port).toBe(3000);
    expect(env.db.host).toBe("db.internal");
  });
});
