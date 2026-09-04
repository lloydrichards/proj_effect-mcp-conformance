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

const statefulProtocolVersions: ReadonlyArray<ProtocolVersion> = [
  "2025-11-25",
  "2025-06-18",
  "2025-03-26",
  "2024-11-05",
];

const audioProtocolVersions: ReadonlyArray<ProtocolVersion> = [
  "2026-07-28",
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
    protocolVersions: statefulProtocolVersions,
  },
  {
    name: "server-session-lifecycle",
    protocolVersions: ["2025-11-25", "2025-06-18", "2025-03-26"],
  },
  {
    name: "logging-set-level",
    protocolVersions: statefulProtocolVersions,
  },
  { name: "ping", protocolVersions: statefulProtocolVersions },
  {
    name: "completion-complete",
    protocolVersions: allProtocolVersions,
  },
  {
    name: "tools-list",
    protocolVersions: allProtocolVersions,
  },
  {
    name: "tools-call-simple-text",
    protocolVersions: allProtocolVersions,
  },
  {
    name: "tools-call-image",
    protocolVersions: allProtocolVersions,
  },
  {
    name: "tools-call-audio",
    protocolVersions: audioProtocolVersions,
  },
  {
    name: "tools-call-embedded-resource",
    protocolVersions: allProtocolVersions,
  },
  {
    name: "tools-call-mixed-content",
    protocolVersions: allProtocolVersions,
  },
  {
    name: "tools-call-with-logging",
    protocolVersions: statefulProtocolVersions,
  },
  {
    name: "tools-call-error",
    protocolVersions: allProtocolVersions,
  },
  {
    name: "tools-call-with-progress",
    protocolVersions: allProtocolVersions,
  },
  {
    name: "tools-call-sampling",
    protocolVersions: statefulProtocolVersions,
  },
  {
    name: "tools-call-elicitation",
    protocolVersions: elicitationProtocolVersions,
  },
  {
    name: "json-schema-2020-12",
    protocolVersions: ["2025-11-25"],
  },
  {
    name: "elicitation-sep1034-defaults",
    protocolVersions: ["2025-11-25"],
  },
  {
    name: "elicitation-sep1330-enums",
    protocolVersions: ["2025-11-25"],
  },
  {
    name: "resources-list",
    protocolVersions: allProtocolVersions,
  },
  {
    name: "resources-read-text",
    protocolVersions: allProtocolVersions,
  },
  {
    name: "resources-read-binary",
    protocolVersions: allProtocolVersions,
  },
  {
    name: "resources-templates-read",
    protocolVersions: allProtocolVersions,
  },
  {
    name: "prompts-list",
    protocolVersions: allProtocolVersions,
  },
  {
    name: "prompts-get-simple",
    protocolVersions: allProtocolVersions,
  },
  {
    name: "prompts-get-with-args",
    protocolVersions: allProtocolVersions,
  },
  {
    name: "prompts-get-embedded-resource",
    protocolVersions: allProtocolVersions,
  },
  {
    name: "prompts-get-with-image",
    protocolVersions: allProtocolVersions,
  },
];

export const scenarioNames = scenarios.map((scenario) => scenario.name);

export const findScenario = (name: string) =>
  scenarios.find((scenario) => scenario.name === name);
