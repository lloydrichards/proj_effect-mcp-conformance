import {
  existsSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  writeFileSync,
} from "node:fs";
import { relative, resolve } from "node:path";
import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";

const repository = resolve(import.meta.dirname, "..");
const output = resolve(
  repository,
  ".cache/client-conformance",
  new Date().toISOString().replaceAll(":", "-"),
);
mkdirSync(output, { recursive: true });
const coreScenarios = [
  "initialize",
  "tools_call",
  "json-schema-2020-12-preservation",
  "request-metadata",
  "http-standard-headers",
  "http-custom-headers",
  "http-invalid-tool-headers",
  "json-schema-ref-no-deref",
];
const implementations = [
  {
    name: "direct",
    entrypoint: "apps/conformance/src/client.ts",
    scenarios: coreScenarios,
  },
  {
    name: "layer",
    entrypoint: "apps/conformance/src/clients/layer.ts",
    scenarios: coreScenarios,
  },
  {
    name: "toolkit",
    entrypoint: "apps/conformance/src/clients/toolkit.ts",
    scenarios: [
      "tools_call",
      "json-schema-2020-12-preservation",
      "http-custom-headers",
      "json-schema-ref-no-deref",
    ],
  },
];
const selectedImplementation = process.argv[3];
if (
  selectedImplementation !== undefined &&
  !implementations.some(({ name }) => name === selectedImplementation)
)
  throw new Error(`Unknown implementation: ${selectedImplementation}`);
const selectedImplementations = implementations.filter(
  ({ name }) =>
    selectedImplementation === undefined || name === selectedImplementation,
);
const bundles = selectedImplementations.map((implementation) => {
  const directory = resolve(output, implementation.name);
  mkdirSync(directory, { recursive: true });
  const build = spawnSync(
    "bun",
    ["build", implementation.entrypoint, "--target=bun", "--outdir", directory],
    { cwd: repository, encoding: "utf8" },
  );
  writeFileSync(
    resolve(directory, "build.log"),
    `${build.stdout ?? ""}${build.stderr ?? ""}`,
  );
  if (build.error || build.status !== 0)
    throw new Error(
      `Client fixture build failed: ${build.error ?? build.stderr}`,
    );
  const filename = implementation.entrypoint
    .split("/")
    .at(-1)
    .replace(/\.ts$/, ".js");
  const path = resolve(directory, filename);
  return {
    ...implementation,
    command: `bun run ${relative(repository, path)}`,
    sha256: createHash("sha256").update(readFileSync(path)).digest("hex"),
  };
});
const packageVersion = (path) =>
  JSON.parse(readFileSync(resolve(repository, path), "utf8")).version;
writeFileSync(
  resolve(output, "environment.json"),
  `${JSON.stringify(
    {
      runner: packageVersion(
        "node_modules/@modelcontextprotocol/conformance/package.json",
      ),
      effect: packageVersion(
        "apps/conformance/node_modules/effect/package.json",
      ),
      clientSourceSha256: createHash("sha256")
        .update(
          readFileSync(
            resolve(
              repository,
              "apps/conformance/node_modules/effect/dist/ai/McpClient.js",
            ),
          ),
        )
        .digest("hex"),
      bun: spawnSync("bun", ["--version"], { encoding: "utf8" }).stdout.trim(),
      fixtures: bundles.map(({ name, entrypoint, sha256 }) => ({
        name,
        entrypoint,
        sha256,
      })),
    },
    null,
    2,
  )}\n`,
);
const versions = ["2025-11-25", "2026-07-28"];
const scenarios = [
  ["initialize", [versions[0]]],
  ["tools_call", versions],
  ["json-schema-2020-12-preservation", versions],
  ...[
    "request-metadata",
    "http-standard-headers",
    "http-custom-headers",
    "http-invalid-tool-headers",
    "json-schema-ref-no-deref",
  ].map((name) => [name, [versions[1]]]),
];
const selected = process.argv[2];
if (selected !== undefined && !scenarios.some(([name]) => name === selected)) {
  throw new Error(`Unsupported client scenario: ${selected}`);
}
const rows = [];
for (const implementation of bundles) {
  for (const [scenario, protocols] of scenarios) {
    if (
      implementation.scenarios !== undefined &&
      !implementation.scenarios.includes(scenario)
    )
      continue;
    if (selected !== undefined && selected !== scenario) continue;
    for (const protocol of protocols) {
      const directory = resolve(
        output,
        implementation.name,
        `${scenario}-${protocol}`,
      );
      mkdirSync(directory, { recursive: true });
      const run = spawnSync(
        "bun",
        [
          "node_modules/@modelcontextprotocol/conformance/dist/index.js",
          "client",
          "--command",
          implementation.command,
          "--scenario",
          scenario,
          "--spec-version",
          protocol,
          "--timeout",
          "20000",
          "--output-dir",
          directory,
        ],
        { cwd: repository, encoding: "utf8", timeout: 30000 },
      );
      writeFileSync(
        resolve(directory, "runner.log"),
        `${run.stdout ?? ""}${run.stderr ?? ""}${run.error ?? ""}`,
      );
      const resultDirectory = readdirSync(directory).find((name) =>
        name.startsWith(`${scenario}-`),
      );
      const checksPath =
        resultDirectory === undefined
          ? undefined
          : resolve(directory, resultDirectory, "checks.json");
      const checks =
        checksPath !== undefined && existsSync(checksPath)
          ? JSON.parse(readFileSync(checksPath, "utf8"))
          : [];
      const failed = checks.filter((check) => check.status === "FAILURE");
      const warnings = checks.filter((check) => check.status === "WARNING");
      const passed = checks.filter(
        (check) => check.status === "SUCCESS",
      ).length;
      const status =
        run.status === 0 &&
        checks.length > 0 &&
        failed.length === 0 &&
        passed > 0
          ? "PASS"
          : "FAIL";
      rows.push({
        implementation: implementation.name,
        scenario,
        protocol,
        status,
        exitCode: run.status,
        passed,
        failed,
        warnings,
        directory,
      });
      console.log(
        `${status} ${scenario} [${implementation.name}] ${protocol}: ${passed} passed, ${failed.length} failed`,
      );
    }
  }
}
if (rows.length === 0)
  throw new Error("No applicable client scenarios selected");
writeFileSync(
  resolve(output, "summary.json"),
  `${JSON.stringify(rows, null, 2)}\n`,
);
console.log(`Results: ${output}`);
if (rows.some((row) => row.status === "FAIL")) process.exitCode = 1;
