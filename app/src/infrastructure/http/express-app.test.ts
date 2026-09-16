import { describe, expect, it } from "vitest";
import request from "supertest";
import { createExpressApp } from "./express-app";
import { GetServiceInfoUseCase } from "../../application/get-service-info.usecase";
import type { InfoRepository } from "../../domain/ports/info-repository.port";
import { InfoUnavailableError } from "../../domain/errors/info-unavailable.error";

function buildApp(infoRepository: InfoRepository) {
  const useCase = new GetServiceInfoUseCase(infoRepository);
  return createExpressApp(useCase);
}

describe("createExpressApp", () => {
  it("GET /health never touches the database", async () => {
    const app = buildApp({
      now: async () => {
        throw new Error("should never be called");
      },
    });

    const res = await request(app).get("/health");

    expect(res.status).toBe(200);
    expect(res.body.data.status).toBe("ok");
    expect(res.body.data.timestamp).toEqual(expect.any(String));
  });

  it("GET /v1/info returns 200 when the db is reachable", async () => {
    const app = buildApp({ now: async () => new Date("2026-01-01T00:00:00.000Z") });

    const res = await request(app).get("/v1/info");

    expect(res.status).toBe(200);
    expect(res.body.data.db_status).toBe("connected");
  });

  it("GET /v1/info returns 503 when the db is unreachable", async () => {
    const app = buildApp({
      now: async () => {
        throw new InfoUnavailableError(new Error("down"));
      },
    });

    const res = await request(app).get("/v1/info");

    expect(res.status).toBe(503);
    expect(res.body.data.db_status).toBe("unreachable");
  });

  it("returns a standardized 404 envelope for unknown routes", async () => {
    const app = buildApp({ now: async () => new Date() });

    const res = await request(app).get("/does-not-exist");

    expect(res.status).toBe(404);
    expect(res.body).toEqual({ success: false, error: { message: "Not found" } });
  });
});
