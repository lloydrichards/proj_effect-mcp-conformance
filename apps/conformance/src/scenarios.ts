import {
  supportedProtocolVersions,
  type ProtocolVersion,
} from "@repo/mcp-fixture";

export interface Scenario {
  readonly name: string;
  readonly protocolVersions: ReadonlyArray<ProtocolVersion>;
  readonly conformanceName?: string;
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

const baseScenarios: ReadonlyArray<Scenario> = [
  {
    name: "server-initialize",
    protocolVersions: statefulProtocolVersions,
  },
  {
    name: "server-session-lifecycle",
    protocolVersions: ["2025-11-25", "2025-06-18", "2025-03-26"],
  },
  {
    name: "server-stateless",
    protocolVersions: ["2026-07-28"],
  },
  {
    name: "server-sse-multiple-streams",
    protocolVersions: ["2026-07-28"],
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
    protocolVersions: ["2026-07-28", "2025-11-25"],
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
    name: "sep-2164-resource-not-found",
    protocolVersions: ["2026-07-28"],
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
  {
    name: "dns-rebinding-protection",
    protocolVersions: ["2026-07-28"],
  },
  {
    name: "caching",
    protocolVersions: ["2026-07-28"],
  },
  {
    name: "http-header-validation",
    protocolVersions: ["2026-07-28"],
  },
  {
    name: "http-custom-header-server-validation",
    protocolVersions: ["2026-07-28"],
  },
  ...[
    "input-required-result-basic-elicitation",
    "input-required-result-basic-sampling",
    "input-required-result-basic-list-roots",
    "input-required-result-request-state",
    "input-required-result-multiple-input-requests",
    "input-required-result-multi-round",
    "input-required-result-missing-input-response",
    "input-required-result-non-tool-request",
    "input-required-result-result-type",
    "input-required-result-unsupported-methods",
    "input-required-result-tampered-state",
    "input-required-result-capability-check",
    "input-required-result-ignore-extra-params",
    "input-required-result-validate-input",
  ].map((name) => ({
    name,
    protocolVersions: ["2026-07-28"] as ReadonlyArray<ProtocolVersion>,
  })),
];

interface AlternateImplementation {
  readonly name: string;
  readonly scenarios: ReadonlyArray<string>;
}

const inputRequired = (suffixes: ReadonlyArray<string>) =>
  suffixes.map((suffix) => `input-required-result-${suffix}`);

const alternateImplementations: ReadonlyArray<AlternateImplementation> = [
  { name: "typed-toolkit-http", scenarios: ["tools-list"] },
  {
    name: "imperative-public-api-http",
    scenarios: [
      "completion-complete",
      "tools-list",
      "resources-list",
      "resources-read-text",
      "prompts-list",
      "prompts-get-simple",
      "prompts-get-with-args",
    ],
  },
  {
    name: "raw-registry-http",
    scenarios: [
      "tools-list",
      "tools-call-simple-text",
      "resources-list",
      "resources-read-text",
      "prompts-list",
      "prompts-get-simple",
    ],
  },
  {
    name: "multi-capability-public-http",
    scenarios: [
      "completion-complete",
      "tools-list",
      "tools-call-simple-text",
      "resources-list",
      "resources-read-text",
      "prompts-list",
      "prompts-get-simple",
      "prompts-get-with-args",
    ],
  },
  { name: "dynamic-registry-http", scenarios: ["server-stateless"] },
  {
    name: "stateful-interactive-http",
    scenarios: ["tools-call-with-logging", "tools-call-with-progress"],
  },
  {
    name: "mrtr-happy-path-http",
    scenarios: inputRequired([
      "basic-elicitation",
      "basic-sampling",
      "basic-list-roots",
    ]),
  },
  {
    name: "mrtr-state-machine-http",
    scenarios: inputRequired([
      "request-state",
      "multiple-input-requests",
      "multi-round",
      "tampered-state",
    ]),
  },
  {
    name: "mrtr-adversarial-http",
    scenarios: inputRequired([
      "missing-input-response",
      "result-type",
      "capability-check",
      "ignore-extra-params",
      "validate-input",
    ]),
  },
  { name: "schema-edge-cases-http", scenarios: ["json-schema-2020-12"] },
  {
    name: "hardened-http",
    scenarios: [
      "http-header-validation",
      "http-custom-header-server-validation",
    ],
  },
];

const variantSuffixes = ["II", "III", "IV", "V"] as const;

const alternateScenariosFor = (scenario: Scenario) =>
  alternateImplementations.flatMap((implementation, index) => {
    if (!implementation.scenarios.includes(scenario.name)) return [];
    const precedingImplementations = alternateImplementations
      .slice(0, index)
      .filter((candidate) => candidate.scenarios.includes(scenario.name));
    const suffix = variantSuffixes[precedingImplementations.length];
    if (suffix === undefined) {
      throw new Error(
        `Too many alternate implementations for ${scenario.name}`,
      );
    }
    return [
      {
        name: `${scenario.name}-${suffix}`,
        conformanceName: scenario.name,
        protocolVersions: scenario.protocolVersions,
      },
    ];
  });

export const scenarios: ReadonlyArray<Scenario> = baseScenarios.flatMap(
  (scenario) => [scenario, ...alternateScenariosFor(scenario)],
);

export const scenarioNames = scenarios.map((scenario) => scenario.name);

export const findScenario = (name: string) =>
  scenarios.find((scenario) => scenario.name === name);

export const conformanceNameFor = (scenario: Scenario) =>
  scenario.conformanceName ?? scenario.name;

export const entrypointFor = (scenario: Scenario) =>
  `scenarios/${scenario.name}/src/index.ts`;
