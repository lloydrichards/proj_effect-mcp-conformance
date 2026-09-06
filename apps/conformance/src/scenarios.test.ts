import { describe, expect, it } from "vitest";
import { existsSync } from "node:fs";
import {
  conformanceNameFor,
  entrypointFor,
  findScenario,
  scenarioNames,
} from "./scenarios";

describe("scenario implementations", () => {
  it("keeps the original scenario as the first implementation", () => {
    const scenario = findScenario("tools-list");

    expect(scenario).toBeDefined();
    if (scenario === undefined) return;
    expect(conformanceNameFor(scenario)).toBe("tools-list");
    expect(entrypointFor(scenario)).toBe("scenarios/tools-list/src/index.ts");
  });

  it("names alternate implementations with Roman numeral suffixes", () => {
    expect(scenarioNames).toContain("tools-list-II");
    expect(scenarioNames).toContain("tools-list-III");
    expect(scenarioNames).toContain("tools-list-IV");
    expect(scenarioNames).toContain("tools-list-V");
  });

  it("places alternate implementations immediately after their base scenario", () => {
    const toolsListIndex = scenarioNames.indexOf("tools-list");

    expect(scenarioNames.slice(toolsListIndex, toolsListIndex + 5)).toEqual([
      "tools-list",
      "tools-list-II",
      "tools-list-III",
      "tools-list-IV",
      "tools-list-V",
    ]);
    expect(
      scenarioNames.slice(
        scenarioNames.indexOf("server-stateless"),
        scenarioNames.indexOf("server-stateless") + 2,
      ),
    ).toEqual(["server-stateless", "server-stateless-II"]);
  });

  it("runs a suffixed implementation against the original conformance scenario", () => {
    const scenario = findScenario("tools-list-II");

    expect(scenario).toBeDefined();
    if (scenario === undefined) return;
    expect(conformanceNameFor(scenario)).toBe("tools-list");
    expect(entrypointFor(scenario)).toBe(
      "scenarios/tools-list-II/src/index.ts",
    );
  });

  it("preserves protocol applicability for alternate implementations", () => {
    const scenario = findScenario("server-stateless-II");

    expect(scenario?.protocolVersions).toEqual(["2026-07-28"]);
  });

  it("gives every scenario a matching scenario directory", () => {
    const repository = new URL("../../..", import.meta.url);

    for (const name of scenarioNames) {
      expect(
        existsSync(new URL(`scenarios/${name}/src/index.ts`, repository)),
        `missing scenario entrypoint for ${name}`,
      ).toBe(true);
    }
  });
});
