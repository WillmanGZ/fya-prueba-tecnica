import { describe, expect, it } from "vitest";
import { GetServiceInfoUseCase } from "./get-service-info.usecase";
import type { InfoRepository } from "../domain/ports/info-repository.port";
import { InfoUnavailableError } from "../domain/errors/info-unavailable.error";

describe("GetServiceInfoUseCase", () => {
  it("reports connected status with the repository's time", async () => {
    const fakeInfoRepository: InfoRepository = {
      now: async () => new Date("2026-01-01T00:00:00.000Z"),
    };
    const useCase = new GetServiceInfoUseCase(fakeInfoRepository);

    const result = await useCase.execute();

    expect(result).toEqual({
      db_status: "connected",
      db_time: "2026-01-01T00:00:00.000Z",
    });
  });

  it("reports unreachable status when the repository can't be reached", async () => {
    const failingInfoRepository: InfoRepository = {
      now: async () => {
        throw new InfoUnavailableError(new Error("connection refused"));
      },
    };
    const useCase = new GetServiceInfoUseCase(failingInfoRepository);

    const result = await useCase.execute();

    expect(result.db_status).toBe("unreachable");
    expect(result.db_time).toBeNull();
  });

  it("does not swallow unexpected errors as a db outage", async () => {
    const buggyInfoRepository: InfoRepository = {
      now: async () => {
        throw new TypeError("something else broke");
      },
    };
    const useCase = new GetServiceInfoUseCase(buggyInfoRepository);

    await expect(useCase.execute()).rejects.toThrow(TypeError);
  });
});
