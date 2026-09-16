import { describe, expect, it } from "vitest";
import { fail, ok } from "./api-response";

describe("api-response helpers", () => {
  it("ok() wraps data in a success envelope", () => {
    expect(ok({ status: "ok" })).toEqual({ success: true, data: { status: "ok" } });
  });

  it("fail() wraps a message in an error envelope", () => {
    expect(fail("Not found")).toEqual({ success: false, error: { message: "Not found" } });
  });
});
