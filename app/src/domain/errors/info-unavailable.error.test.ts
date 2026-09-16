import { describe, expect, it } from "vitest";
import { InfoUnavailableError } from "./info-unavailable.error";

describe("InfoUnavailableError", () => {
  it("wraps the original cause and sets a descriptive name/message", () => {
    const cause = new Error("ECONNREFUSED");

    const error = new InfoUnavailableError(cause);

    expect(error).toBeInstanceOf(Error);
    expect(error.name).toBe("InfoUnavailableError");
    expect(error.message).toBe("Info repository is unavailable");
    expect(error.cause).toBe(cause);
  });
});
