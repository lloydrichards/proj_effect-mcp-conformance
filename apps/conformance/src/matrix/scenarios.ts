import { type ProtocolVersion } from "@repo/mcp-fixture";
import { scenarios, conformanceNameFor, entrypointFor } from "../scenarios";

export interface MatrixScenario {
  readonly name: string;
  readonly direction: "client" | "server";
  readonly conformanceName: string;
  readonly protocolVersions: ReadonlyArray<ProtocolVersion>;
  readonly entrypoint: string;
  readonly implementation?: string;
}

const bothProtocols: ReadonlyArray<ProtocolVersion> = [
  "2025-11-25",
  "2026-07-28",
];
const modernProtocol: ReadonlyArray<ProtocolVersion> = ["2026-07-28"];

const baseScenarios: ReadonlyArray<{
  name: string;
  conformanceName?: string;
  protocolVersions: ReadonlyArray<ProtocolVersion>;
  toolkit?: boolean;
}> = [
  { name: "initialize", protocolVersions: ["2025-11-25"] },
  {
    name: "tools-call",
    conformanceName: "tools_call",
    protocolVersions: bothProtocols,
    toolkit: true,
  },
  {
    name: "json-schema-2020-12-preservation",
    protocolVersions: bothProtocols,
    toolkit: true,
  },
  { name: "request-metadata", protocolVersions: modernProtocol },
  { name: "http-standard-headers", protocolVersions: modernProtocol },
  {
    name: "http-custom-headers",
    protocolVersions: modernProtocol,
    toolkit: true,
  },
  { name: "http-invalid-tool-headers", protocolVersions: modernProtocol },
  {
    name: "json-schema-ref-no-deref",
    protocolVersions: modernProtocol,
    toolkit: true,
  },
];

const implementations = [
  { implementation: "direct", suffix: "" },
  { implementation: "layer", suffix: "-II" },
  { implementation: "toolkit", suffix: "-III" },
];

const clientScenarios: ReadonlyArray<MatrixScenario> = baseScenarios.flatMap(
  (scenario) =>
    implementations
      .filter(
        ({ implementation }) =>
          implementation !== "toolkit" || scenario.toolkit,
      )
      .map(({ implementation, suffix }) => {
        const name = `client-${scenario.name}${suffix}`;
        return {
          name,
          direction: "client",
          implementation,
          conformanceName: scenario.conformanceName ?? scenario.name,
          protocolVersions: scenario.protocolVersions,
          entrypoint: `scenarios/${name}/src/index.ts`,
        };
      }),
);

export const matrixScenarios: ReadonlyArray<MatrixScenario> = [
  ...scenarios.map((scenario): MatrixScenario => ({
    name: scenario.name,
    direction: "server",
    conformanceName: conformanceNameFor(scenario),
    protocolVersions: scenario.protocolVersions,
    entrypoint: entrypointFor(scenario),
  })),
  ...clientScenarios,
];

export type MatrixSelection = "all" | "client" | "server";

export const selectScenarios = (
  direction: MatrixSelection,
  name?: string,
  implementation?: string,
) => {
  const candidates = matrixScenarios.filter(
    (scenario) =>
      (direction === "all" || scenario.direction === direction) &&
      (implementation === undefined ||
        scenario.implementation === implementation),
  );
  if (name === undefined) return candidates;
  const exact = candidates.filter((scenario) => scenario.name === name);
  return exact.length > 0
    ? exact
    : candidates.filter((scenario) => scenario.conformanceName === name);
};
