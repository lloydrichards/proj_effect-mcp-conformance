import {
  supportedProtocolVersions,
  type ProtocolVersion,
} from "@repo/mcp-fixture";

export interface Scenario {
  readonly name: string;
  readonly protocolVersions: ReadonlyArray<ProtocolVersion>;
}

const supportedConformanceProtocolVersions: ReadonlyArray<ProtocolVersion> =
  supportedProtocolVersions;

const audioProtocolVersions: ReadonlyArray<ProtocolVersion> = [
  "2025-11-25",
  "2025-06-18",
  "2025-03-26",
];

const elicitationProtocolVersions: ReadonlyArray<ProtocolVersion> = [
  "2025-11-25",
  "2025-06-18",
];

export const scenarios: ReadonlyArray<Scenario> = [
  {
    name: "server-initialize",
    protocolVersions: supportedConformanceProtocolVersions,
  },
  {
    name: "logging-set-level",
    protocolVersions: supportedConformanceProtocolVersions,
  },
  { name: "ping", protocolVersions: supportedConformanceProtocolVersions },
  {
    name: "completion-complete",
    protocolVersions: supportedConformanceProtocolVersions,
  },
  {
    name: "tools-list",
    protocolVersions: supportedConformanceProtocolVersions,
  },
  {
    name: "tools-call-simple-text",
    protocolVersions: supportedConformanceProtocolVersions,
  },
  {
    name: "tools-call-image",
    protocolVersions: supportedConformanceProtocolVersions,
  },
  {
    name: "tools-call-audio",
    protocolVersions: audioProtocolVersions,
  },
  {
    name: "tools-call-embedded-resource",
    protocolVersions: supportedConformanceProtocolVersions,
  },
  {
    name: "tools-call-mixed-content",
    protocolVersions: supportedConformanceProtocolVersions,
  },
  {
    name: "tools-call-with-logging",
    protocolVersions: supportedConformanceProtocolVersions,
  },
  {
    name: "tools-call-error",
    protocolVersions: supportedConformanceProtocolVersions,
  },
  {
    name: "tools-call-with-progress",
    protocolVersions: supportedConformanceProtocolVersions,
  },
  {
    name: "tools-call-sampling",
    protocolVersions: supportedConformanceProtocolVersions,
  },
  {
    name: "tools-call-elicitation",
    protocolVersions: elicitationProtocolVersions,
  },
  {
    name: "resources-list",
    protocolVersions: supportedConformanceProtocolVersions,
  },
  {
    name: "resources-read-text",
    protocolVersions: supportedConformanceProtocolVersions,
  },
  {
    name: "resources-read-binary",
    protocolVersions: supportedConformanceProtocolVersions,
  },
  {
    name: "resources-templates-read",
    protocolVersions: supportedConformanceProtocolVersions,
  },
  {
    name: "prompts-list",
    protocolVersions: supportedConformanceProtocolVersions,
  },
  {
    name: "prompts-get-simple",
    protocolVersions: supportedConformanceProtocolVersions,
  },
  {
    name: "prompts-get-with-args",
    protocolVersions: supportedConformanceProtocolVersions,
  },
  {
    name: "prompts-get-embedded-resource",
    protocolVersions: supportedConformanceProtocolVersions,
  },
  {
    name: "prompts-get-with-image",
    protocolVersions: supportedConformanceProtocolVersions,
  },
];

export const scenarioNames = scenarios.map((scenario) => scenario.name);

export const findScenario = (name: string) =>
  scenarios.find((scenario) => scenario.name === name);
