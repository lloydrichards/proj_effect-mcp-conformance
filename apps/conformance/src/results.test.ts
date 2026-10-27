import { describe, expect, it } from "vitest";
import { resultExitCode, skippedExitCode } from "./results";

describe("conformance outcomes", () => {
  it("reports an upstream-only skip without claiming a pass", () => {
    expect(resultExitCode(0, [{ status: "SKIPPED" }])).toBe(skippedExitCode);
  });

  it("preserves failure when a skipped check accompanies a failure", () => {
    expect(
      resultExitCode(1, [{ status: "SKIPPED" }, { status: "FAILURE" }]),
    ).toBe(1);
  });

  it("keeps a successful check passing when another check is skipped", () => {
    expect(
      resultExitCode(0, [{ status: "SKIPPED" }, { status: "SUCCESS" }]),
    ).toBe(0);
  });
});
