import {
  supportedProtocolVersions,
  type ProtocolVersion,
} from "@repo/mcp-fixture";

export interface Scenario {
  readonly name: string;
  readonly protocolVersions: ReadonlyArray<ProtocolVersion>;
  readonly conformanceName?: string;
  readonly extension?: string;
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
  ...[
    "sep-2640-skills-directory",
    "sep-2640-skills-enumeration",
    "sep-2640-skills-manifest",
  ].map((name) => ({
    name,
    extension: "io.modelcontextprotocol/skills",
    protocolVersions: ["2026-07-28"] as ReadonlyArray<ProtocolVersion>,
  })),
  {
    name: "server-initialize",
    protocolVersions: statefulProtocolVersions,
  },
  {
    name: "server-session-lifecycle",
    protocolVersions: ["2025-11-25", "2025-06-18", "2025-03-26"],
  },
  ...["server-stateless", "server-stateless-II"].map((name) => ({
    name,
    conformanceName: "server-stateless",
    protocolVersions: ["2026-07-28"] as const,
  })),

  {
    name: "server-sse-multiple-streams",
    protocolVersions: ["2026-07-28"],
  },
  {
    name: "logging-set-level",
    protocolVersions: statefulProtocolVersions,
  },
  { name: "ping", protocolVersions: statefulProtocolVersions },
  ...[
    "completion-complete",
    "completion-complete-II",
    "completion-complete-III",
  ].map((name) => ({
    name,
    conformanceName: "completion-complete",
    protocolVersions: allProtocolVersions,
  })),
  {
    name: "tools-list",
    protocolVersions: allProtocolVersions,
  },
  ...["tools-list-II", "tools-list-III", "tools-list-IV", "tools-list-V"].map(
    (name) => ({
      name,
      conformanceName: "tools-list",
      protocolVersions: allProtocolVersions,
    }),
  ),
  ...[
    "tools-call-simple-text",
    "tools-call-simple-text-II",
    "tools-call-simple-text-III",
  ].map((name) => ({
    name,
    conformanceName: "tools-call-simple-text",
    protocolVersions: allProtocolVersions,
  })),
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
  ...["tools-call-with-logging", "tools-call-with-logging-II"].map((name) => ({
    name,
    conformanceName: "tools-call-with-logging",
    protocolVersions: statefulProtocolVersions,
  })),

  {
    name: "tools-call-error",
    protocolVersions: allProtocolVersions,
  },
  ...["tools-call-with-progress", "tools-call-with-progress-II"].map(
    (name) => ({
      name,
      conformanceName: "tools-call-with-progress",
      protocolVersions: allProtocolVersions,
    }),
  ),

  {
    name: "tools-call-sampling",
    protocolVersions: statefulProtocolVersions,
  },
  {
    name: "tools-call-elicitation",
    protocolVersions: elicitationProtocolVersions,
  },
  ...["json-schema-2020-12", "json-schema-2020-12-II"].map((name) => ({
    name,
    conformanceName: "json-schema-2020-12",
    protocolVersions: ["2026-07-28", "2025-11-25"] as const,
  })),
  {
    name: "elicitation-sep1034-defaults",
    protocolVersions: ["2025-11-25"],
  },
  {
    name: "elicitation-sep1330-enums",
    protocolVersions: ["2025-11-25"],
  },
  ...[
    "resources-list",
    "resources-list-II",
    "resources-list-III",
    "resources-list-IV",
  ].map((name) => ({
    name,
    conformanceName: "resources-list",
    protocolVersions: allProtocolVersions,
  })),
  {
    name: "resources-read-text",
    protocolVersions: allProtocolVersions,
  },
  ...[
    "resources-read-text-II",
    "resources-read-text-III",
    "resources-read-text-IV",
  ].map((name) => ({
    name,
    conformanceName: "resources-read-text",
    protocolVersions: allProtocolVersions,
  })),
  {
    name: "resources-read-binary",
    protocolVersions: allProtocolVersions,
  },
  {
    name: "resources-templates-read",
    protocolVersions: allProtocolVersions,
  },
  {
    name: "sep-2164-resource-not-found",
    protocolVersions: ["2026-07-28"],
  },
  ...[
    "prompts-list",
    "prompts-list-II",
    "prompts-list-III",
    "prompts-list-IV",
  ].map((name) => ({
    name,
    conformanceName: "prompts-list",
    protocolVersions: allProtocolVersions,
  })),
  ...[
    "prompts-get-simple",
    "prompts-get-simple-II",
    "prompts-get-simple-III",
    "prompts-get-simple-IV",
  ].map((name) => ({
    name,
    conformanceName: "prompts-get-simple",
    protocolVersions: allProtocolVersions,
  })),
  ...[
    "prompts-get-with-args",
    "prompts-get-with-args-II",
    "prompts-get-with-args-III",
  ].map((name) => ({
    name,
    conformanceName: "prompts-get-with-args",
    protocolVersions: allProtocolVersions,
  })),
  {
    name: "prompts-get-embedded-resource",
    protocolVersions: allProtocolVersions,
  },
  {
    name: "prompts-get-with-image",
    protocolVersions: allProtocolVersions,
  },
  {
    name: "dns-rebinding-protection",
    protocolVersions: ["2026-07-28"],
  },
  {
    name: "caching",
    protocolVersions: ["2026-07-28"],
  },
  ...["http-header-validation", "http-header-validation-II"].map((name) => ({
    name,
    conformanceName: "http-header-validation",
    protocolVersions: ["2026-07-28"] as const,
  })),
  ...[
    "http-custom-header-server-validation",
    "http-custom-header-server-validation-II",
  ].map((name) => ({
    name,
    conformanceName: "http-custom-header-server-validation",
    protocolVersions: ["2026-07-28"] as const,
  })),
  ...[
    "input-required-result-basic-elicitation",
    "input-required-result-basic-elicitation-II",
    "input-required-result-basic-sampling",
    "input-required-result-basic-sampling-II",
    "input-required-result-basic-list-roots",
    "input-required-result-basic-list-roots-II",
    "input-required-result-request-state",
    "input-required-result-request-state-II",
    "input-required-result-multiple-input-requests",
    "input-required-result-multiple-input-requests-II",
    "input-required-result-multi-round",
    "input-required-result-multi-round-II",
    "input-required-result-missing-input-response",
    "input-required-result-missing-input-response-II",
    "input-required-result-non-tool-request",
    "input-required-result-result-type",
    "input-required-result-result-type-II",
    "input-required-result-unsupported-methods",
    "input-required-result-tampered-state",
    "input-required-result-tampered-state-II",
    "input-required-result-capability-check",
    "input-required-result-capability-check-II",
    "input-required-result-ignore-extra-params",
    "input-required-result-ignore-extra-params-II",
    "input-required-result-validate-input",
    "input-required-result-validate-input-II",
  ].map((name) => ({
    name,
    conformanceName: name.replace(/-II$/, ""),
    protocolVersions: ["2026-07-28"] as const,
  })),
];

export const scenarioNames = scenarios.map((scenario) => scenario.name);

export const unavailableScenarios: Readonly<Record<string, string>> = {
  "tasks-lifecycle":
    "The fixture lives on the separate Tasks draft and is maintained separately from Skills coverage.",
  "tasks-capability-negotiation":
    "The fixture lives on the separate Tasks draft and is maintained separately from Skills coverage.",
  "tasks-wire-fields":
    "The fixture lives on the separate Tasks draft and is maintained separately from Skills coverage.",
  "tasks-request-state-removal":
    "The fixture lives on the separate Tasks draft and is maintained separately from Skills coverage.",
  "tasks-mrtr-input":
    "The fixture lives on the separate Tasks draft and is maintained separately from Skills coverage.",
  "tasks-request-headers":
    "The fixture lives on the separate Tasks draft and is maintained separately from Skills coverage.",
  "tasks-dispatch-and-envelope":
    "The fixture lives on the separate Tasks draft and is maintained separately from Skills coverage.",
  "tasks-status-notifications":
    "The fixture lives on the separate Tasks draft and is maintained separately from Skills coverage.",
  "tasks-required-task-error":
    "The fixture lives on the separate Tasks draft and is maintained separately from Skills coverage.",
  "tasks-mrtr-composition":
    "McpTasks.toolkit creates the task before running the handler. The public API cannot return InputRequired before creating a task and then escalate the final MRTR round to CreateTaskResult.",
  "resources-subscribe":
    "McpServer.layerHttp does not expose resource subscription registration for the stateful adapters.",
  "resources-unsubscribe":
    "McpServer.layerHttp does not expose resource subscription registration for the stateful adapters.",
  "server-sse-polling":
    "McpServer.layerHttp does not expose POST stream disconnection, event replay, or Last-Event-ID resumption for test_reconnection.",
};

export const findScenario = (name: string) =>
  scenarios.find((scenario) => scenario.name === name);

export const conformanceNameFor = (scenario: Scenario) =>
  scenario.conformanceName ?? scenario.name;

export const entrypointFor = (scenario: Scenario) =>
  `scenarios/${scenario.name}/src/index.ts`;
