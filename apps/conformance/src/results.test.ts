import { describe, expect, it } from "vitest";
import { resultExitCode, skippedExitCode } from "./results";

describe("conformance outcomes", () => {
  it("reports an upstream-only skip without claiming a pass", () => {
    expect(
      resultExitCode(0, [{ id: "scenario-check", status: "SKIPPED" }]),
    ).toBe(skippedExitCode);
  });

  it("preserves failure when a skipped check accompanies a failure", () => {
    expect(
      resultExitCode(1, [
        { id: "scenario-check", status: "SKIPPED" },
        { id: "scenario-check", status: "FAILURE" },
      ]),
    ).toBe(1);
  });

  it("keeps a successful check passing when another check is skipped", () => {
    expect(
      resultExitCode(0, [
        { id: "scenario-check", status: "SKIPPED" },
        { id: "scenario-check", status: "SUCCESS" },
      ]),
    ).toBe(0);
  });
});

describe("conformance evidence", () => {
  it("keeps skipped behavior skipped when the generic schema check passes", () => {
    expect(
      resultExitCode(0, [
        { id: "sep-2640-skillmd-mimetype", status: "SKIPPED" },
        { id: "wire-schema-valid", status: "SUCCESS" },
      ]),
    ).toBe(skippedExitCode);
  });

  it.each([
    { evidence: "no checks", checks: [] },
    {
      evidence: "only a generic schema check",
      checks: [{ id: "wire-schema-valid", status: "SUCCESS" }],
    },
  ])("fails when the runner supplies $evidence", ({ checks }) => {
    expect(resultExitCode(0, checks)).toBe(1);
  });

  it("fails on a failed check even when the runner exits successfully", () => {
    expect(
      resultExitCode(0, [
        { id: "sep-2640-skills-list-implemented", status: "FAILURE" },
      ]),
    ).toBe(1);
  });

  it("rejects unknown check statuses instead of claiming a pass", () => {
    expect(() =>
      resultExitCode(0, [{ id: "manifest", status: "UNRECOGNIZED" }]),
    ).toThrow();
  });
});
