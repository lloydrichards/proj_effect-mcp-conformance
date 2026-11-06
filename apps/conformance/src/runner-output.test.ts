import { describe, expect, it } from "vitest";
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { latestScenarioChecks } from "./runner-output";

describe("scenario output selection", () => {
  it("reads the newest matching scenario and ignores other scenarios and variants", () => {
    const directory = mkdtempSync(join(tmpdir(), "runner-output-"));
    const save = (name: string, status: string) => {
      const path = join(directory, name);
      mkdirSync(path);
      writeFileSync(
        join(path, "checks.json"),
        JSON.stringify([{ id: "behavior", status }]),
      );
    };
    try {
      save("server-tools-list-2026-11-06T07-00-00-000Z", "SUCCESS");
      save("server-ping-2026-11-06T07-01-00-000Z", "SUCCESS");
      save("server-ping-2026-11-06T07-02-00-000Z", "SKIPPED");
      save("server-ping-II-2026-11-06T07-03-00-000Z", "SUCCESS");
      expect(latestScenarioChecks(directory, "ping")).toEqual([
        { id: "behavior", status: "SKIPPED" },
      ]);
      expect(() => latestScenarioChecks(directory, "missing")).toThrow(
        "did not save any results",
      );
    } finally {
      rmSync(directory, { recursive: true, force: true });
    }
  });
});
