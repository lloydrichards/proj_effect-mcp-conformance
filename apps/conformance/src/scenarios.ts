import type { ProtocolVersion } from "@repo/mcp-fixture";

export interface Scenario {
  readonly name: string;
  readonly protocolVersions: ReadonlyArray<ProtocolVersion>;
}

const legacyAndNovember = ["2025-06-18", "2025-11-25"] as const;

export const scenarios: ReadonlyArray<Scenario> = [
  { name: "server-initialize", protocolVersions: legacyAndNovember },
  { name: "logging-set-level", protocolVersions: legacyAndNovember },
  { name: "ping", protocolVersions: legacyAndNovember },
  { name: "tools-list", protocolVersions: legacyAndNovember },
  { name: "tools-call-simple-text", protocolVersions: legacyAndNovember },
  { name: "tools-call-image", protocolVersions: legacyAndNovember },
  { name: "tools-call-audio", protocolVersions: legacyAndNovember },
  {
    name: "tools-call-embedded-resource",
    protocolVersions: legacyAndNovember,
  },
  { name: "tools-call-mixed-content", protocolVersions: legacyAndNovember },
  { name: "tools-call-with-logging", protocolVersions: legacyAndNovember },
  { name: "tools-call-error", protocolVersions: legacyAndNovember },
  { name: "tools-call-with-progress", protocolVersions: legacyAndNovember },
  { name: "tools-call-sampling", protocolVersions: legacyAndNovember },
  { name: "tools-call-elicitation", protocolVersions: legacyAndNovember },
];

export const scenarioNames = scenarios.map((scenario) => scenario.name);

export const findScenario = (name: string) =>
  scenarios.find((scenario) => scenario.name === name);
