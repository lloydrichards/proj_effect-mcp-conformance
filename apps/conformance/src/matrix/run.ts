import { repository } from "../repository";
import { Console, DateTime, Effect } from "effect";
import {
  supportedProtocolVersions,
  type ProtocolVersion,
} from "@repo/mcp-fixture";
import { createHash } from "node:crypto";
import {
  mkdirSync,
  readFileSync,
  writeFileSync,
  appendFileSync,
} from "node:fs";
import { join, relative } from "node:path";
import { type MatrixScenario, type MatrixSelection } from "./scenarios";
import { classifyResult, readChecks, type CellStatus } from "./results";
import { runProcess } from "./process";
import { formatTable, type Row } from "./table";

const hash = (path: string) =>
  createHash("sha256").update(readFileSync(path)).digest("hex");
const packageVersion = (path: string) =>
  JSON.parse(readFileSync(join(repository, path, "package.json"), "utf8"))
    .version;

export const runMatrix = (
  selection: MatrixSelection,
  scenarios: ReadonlyArray<MatrixScenario>,
  timeout: number,
) =>
  Effect.gen(function* () {
    const startedAt = DateTime.formatIso(yield* DateTime.now);
    const output = join(
      repository,
      ".cache/conformance",
      `${startedAt.replaceAll(":", "-")}-${selection}`,
    );
    mkdirSync(output, { recursive: true });
    const environment = {
      selection,
      bun: Bun.version,
      effect: packageVersion("apps/conformance/node_modules/effect"),
      runner: packageVersion("node_modules/@modelcontextprotocol/conformance"),
      clientSourceSha256: hash(
        join(
          repository,
          "apps/conformance/node_modules/effect/dist/ai/McpClient.js",
        ),
      ),
      fixtures: [] as Array<{
        name: string;
        entrypoint: string;
        sha256: string;
      }>,
    };
    const cells: Array<{
      name: string;
      direction: string;
      protocol: ProtocolVersion;
      status: CellStatus;
      passed: number;
      skipped: number;
      directory: string;
      exitCode: number | null;
    }> = [];
    const rows: Array<Row> = [];
    for (const scenario of scenarios) {
      const fixtureDirectory = join(output, scenario.name);
      mkdirSync(fixtureDirectory, { recursive: true });
      let command: string | undefined;
      if (scenario.direction === "client") {
        const build = yield* runProcess(
          [
            "build",
            scenario.entrypoint,
            "--target=bun",
            "--outdir",
            fixtureDirectory,
          ],
          repository,
          join(fixtureDirectory, "build.log"),
          timeout,
        ).pipe(
          Effect.orElseSucceed(() => ({ exitCode: null, timedOut: false })),
        );
        if (build.exitCode === 0) {
          const bundle = join(fixtureDirectory, "index.js");
          environment.fixtures.push({
            name: scenario.name,
            entrypoint: scenario.entrypoint,
            sha256: hash(bundle),
          });
          command = `bun run ${relative(repository, bundle)}`;
        }
      }
      const results = {} as Record<ProtocolVersion, CellStatus | " -- ">;
      for (const protocol of supportedProtocolVersions) {
        if (!scenario.protocolVersions.includes(protocol)) {
          results[protocol] = " -- ";
          continue;
        }
        const directory = join(fixtureDirectory, protocol);
        mkdirSync(directory, { recursive: true });
        const log = join(directory, "runner.log");
        const args =
          scenario.direction === "server"
            ? [
                "run",
                "--cwd=apps/conformance",
                "start",
                "--",
                "run",
                scenario.name,
                "--protocol",
                protocol,
                "--protocol-case",
                "only",
                "--output-dir",
                directory,
              ]
            : [
                "node_modules/@modelcontextprotocol/conformance/dist/index.js",
                "client",
                "--command",
                command ?? "",
                "--scenario",
                scenario.conformanceName,
                "--spec-version",
                protocol,
                "--timeout",
                String(timeout),
                "--output-dir",
                directory,
              ];
        const processResult =
          scenario.direction === "client" && command === undefined
            ? { exitCode: null, timedOut: false }
            : yield* runProcess(args, repository, log, timeout).pipe(
                Effect.catch((error) =>
                  Effect.sync(() => {
                    appendFileSync(log, String(error));
                    return { exitCode: null, timedOut: false };
                  }),
                ),
              );
        const checks = yield* Effect.try(() => readChecks(directory)).pipe(
          Effect.catch((error) =>
            Effect.sync(() => {
              appendFileSync(
                log,
                `\nInvalid checker output: ${String(error)}\n`,
              );
              return [] as ReturnType<typeof readChecks>;
            }),
          ),
        );
        const status = classifyResult(
          processResult.exitCode,
          processResult.timedOut,
          checks,
        );
        results[protocol] = status;
        cells.push({
          name: scenario.name,
          direction: scenario.direction,
          protocol,
          status,
          passed: checks.filter((check) => check.status === "SUCCESS").length,
          skipped: checks.filter((check) => check.status === "SKIPPED").length,
          directory,
          exitCode: processResult.exitCode,
        });
      }
      rows.push({ scenario: scenario.name, results });
      writeFileSync(
        join(output, "summary.json"),
        JSON.stringify({ rows, cells }, null, 2) + "\n",
      );
      writeFileSync(
        join(output, "environment.json"),
        JSON.stringify(environment, null, 2) + "\n",
      );
    }
    yield* Console.log(formatTable(rows));
    yield* Console.log(`Results: ${output}`);
    if (
      cells.some((cell) => cell.status === "FAIL" || cell.status === "TIMEOUT")
    )
      process.exitCode = 1;
  });
