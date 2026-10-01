import { spawnSync } from "node:child_process";
import {
  conformanceNameFor,
  scenarios,
  unavailableScenarios,
} from "../apps/conformance/src/scenarios";

const result = spawnSync(
  "bunx",
  ["@modelcontextprotocol/conformance", "list", "--server"],
  { encoding: "utf8" },
);
if (result.status !== 0)
  throw new Error(result.stderr || "Could not list upstream server scenarios");
const upstream = [...result.stdout.matchAll(/^  - ([\w-]+)/gm)].map(
  (match) => match[1],
);
if (upstream.length === 0) throw new Error("No upstream scenarios found");
const implemented = new Set(scenarios.map(conformanceNameFor));
const missing = upstream.filter(
  (name) => !implemented.has(name) && !(name in unavailableScenarios),
);
const removed = [...implemented, ...Object.keys(unavailableScenarios)].filter(
  (name) => !upstream.includes(name),
);
console.log(
  `${upstream.length} upstream server scenarios; ${implemented.size} implemented; ${Object.keys(unavailableScenarios).length} unavailable.`,
);
for (const [name, reason] of Object.entries(unavailableScenarios))
  console.log(`${name}: ${reason}`);
for (const name of missing) console.error(`Missing scenario: ${name}`);
for (const name of removed)
  console.error(`Scenario no longer available upstream: ${name}`);
if (missing.length > 0 || removed.length > 0) process.exitCode = 1;
