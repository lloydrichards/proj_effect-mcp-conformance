import {
  supportedProtocolVersions,
  type ProtocolVersion,
} from "@repo/mcp-fixture";

export interface Scenario {
  readonly name: string;
  readonly protocolVersions: ReadonlyArray<ProtocolVersion>;
}

const allProtocolVersions: ReadonlyArray<ProtocolVersion> =
  supportedProtocolVersions;

export const scenarios: ReadonlyArray<Scenario> = [
  { name: "server-initialize", protocolVersions: allProtocolVersions },
  { name: "logging-set-level", protocolVersions: allProtocolVersions },
  { name: "ping", protocolVersions: allProtocolVersions },
  { name: "tools-list", protocolVersions: allProtocolVersions },
  { name: "tools-call-simple-text", protocolVersions: allProtocolVersions },
  { name: "tools-call-image", protocolVersions: allProtocolVersions },
  { name: "tools-call-audio", protocolVersions: allProtocolVersions },
  {
    name: "tools-call-embedded-resource",
    protocolVersions: allProtocolVersions,
  },
  { name: "tools-call-mixed-content", protocolVersions: allProtocolVersions },
  { name: "tools-call-with-logging", protocolVersions: allProtocolVersions },
  { name: "tools-call-error", protocolVersions: allProtocolVersions },
  { name: "tools-call-with-progress", protocolVersions: allProtocolVersions },
  { name: "tools-call-sampling", protocolVersions: allProtocolVersions },
  { name: "tools-call-elicitation", protocolVersions: allProtocolVersions },
];

export const scenarioNames = scenarios.map((scenario) => scenario.name);

export const findScenario = (name: string) =>
  scenarios.find((scenario) => scenario.name === name);
