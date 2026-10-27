import { describe, expect, it } from "vitest";
import {
  supportedProtocolVersions,
  type ProtocolVersion,
} from "@repo/mcp-fixture";
import { classifyResult } from "./results";
import { selectScenarios } from "./scenarios";
import { formatTable } from "./table";

describe("matrix commands", () => {
  it("partitions all implementations into client and server selections", () => {
    const clients = selectScenarios("client");
    const servers = selectScenarios("server");
    expect(clients).toHaveLength(20);
    expect(clients.every((scenario) => scenario.direction === "client")).toBe(
      true,
    );
    expect(servers.every((scenario) => scenario.direction === "server")).toBe(
      true,
    );
    expect(selectScenarios("all")).toEqual([...servers, ...clients]);
    expect(
      clients.reduce(
        (count, scenario) => count + scenario.protocolVersions.length,
        0,
      ),
    ).toBe(26);
  });

  it("accepts an exact variant or an upstream name with an implementation", () => {
    expect(
      selectScenarios("all", "client-tools-call-III").map(
        (scenario) => scenario.name,
      ),
    ).toEqual(["client-tools-call-III"]);
    expect(
      selectScenarios("client", "tools_call", "toolkit").map(
        (scenario) => scenario.name,
      ),
    ).toEqual(["client-tools-call-III"]);
    expect(
      selectScenarios("server", "tools-list").map((scenario) => scenario.name),
    ).toEqual(["tools-list"]);
    expect(selectScenarios("server", "client-tools-call-III")).toEqual([]);
    expect(selectScenarios("client", "missing")).toEqual([]);
  });
});

describe("matrix results", () => {
  it.each([
    [0, false, ["SUCCESS"], "PASS"],
    [0, false, ["SKIPPED"], "SKIP"],
    [0, false, ["SUCCESS", "SKIPPED"], "PASS"],
    [0, false, ["SUCCESS", "FAILURE"], "FAIL"],
    [1, false, ["SUCCESS"], "FAIL"],
    [0, false, [], "FAIL"],
    [0, false, ["INFO"], "FAIL"],
    [null, true, ["SUCCESS"], "TIMEOUT"],
  ] as const)(
    "classifies exit %s and timeout %s with checks %j as %s",
    (exit, timedOut, statuses, expected) => {
      expect(
        classifyResult(
          exit,
          timedOut,
          statuses.map((status) => ({ status })),
        ),
      ).toBe(expected);
    },
  );

  it("renders variant rows and excludes inapplicable cells from the total", () => {
    const results = Object.fromEntries(
      supportedProtocolVersions.map((protocol) => [protocol, " -- "]),
    ) as Record<ProtocolVersion, " -- " | "PASS" | "SKIP">;
    results["2025-11-25"] = "PASS";
    results["2026-07-28"] = "SKIP";
    const table = formatTable([{ scenario: "client-tools-call-III", results }]);
    expect(table).toContain("client-tools-call-III");
    for (const protocol of supportedProtocolVersions)
      expect(table).toContain(`v${protocol}`);
    expect(table).toContain("1/2 applicable checks passing; 1 skipped");
  });
});
