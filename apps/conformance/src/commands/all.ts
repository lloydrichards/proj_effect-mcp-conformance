import { Console, Data, Effect, Option } from "effect";
import { Command, Flag } from "effect/unstable/cli";
import { ChildProcess } from "effect/unstable/process";
import * as Ansi from "effect-boxes/Ansi";
import * as Box from "effect-boxes/Box";
import {
  supportedProtocolVersions,
  type ProtocolVersion,
} from "@repo/mcp-fixture";
import { findScenario, scenarios, type Scenario } from "../scenarios";

const selectedScenario = Flag.string("scenario").pipe(
  Flag.optional,
  Flag.withDescription("Limit the matrix to one scenario"),
);

const timeout = Flag.integer("timeout").pipe(
  Flag.withDefault(10_000),
  Flag.withDescription("Maximum duration in milliseconds for each matrix cell"),
);

const repository = new URL("../../../..", import.meta.url).pathname;

class UnknownScenario extends Data.TaggedError("UnknownScenario")<{
  readonly scenario: string;
}> {}

type Result = "PASS" | "FAIL" | "SKIP" | "TIMEOUT";

interface Row {
  readonly scenario: string;
  readonly results: Readonly<Record<ProtocolVersion, Result>>;
}

const runCell = (
  scenario: Scenario,
  protocol: ProtocolVersion,
  timeout: number,
) =>
  Effect.scoped(
    Effect.gen(function* () {
      if (!scenario.protocolVersions.includes(protocol)) {
        return "SKIP" as const;
      }

      const handle = yield* Effect.acquireRelease(
        ChildProcess.make(
          "bun",
          [
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
          ],
          {
            cwd: repository,
            extendEnv: true,
            stderr: "ignore",
            stdout: "ignore",
          },
        ),
        (handle) =>
          handle.kill({ forceKillAfter: "5 seconds" }).pipe(Effect.ignore),
      );

      return yield* handle.exitCode.pipe(
        Effect.timeoutOption(timeout),
        Effect.match({
          onFailure: () => "FAIL" as const,
          onSuccess: Option.match({
            onNone: () => "TIMEOUT" as const,
            onSome: (exitCode) => (exitCode === 0 ? "PASS" : "FAIL"),
          }),
        }),
      );
    }),
  );

const statusAnnotation = (result: Result) => {
  switch (result) {
    case "PASS":
      return Ansi.green;
    case "FAIL":
      return Ansi.red;
    case "TIMEOUT":
      return Ansi.yellow;
    case "SKIP":
      return Ansi.brightBlack;
  }
};

const formatTable = (rows: ReadonlyArray<Row>) => {
  const headers = [
    "scenario",
    ...supportedProtocolVersions.map((version) => `v${version}`),
  ];
  const values = rows.map((row) => [
    row.scenario,
    ...supportedProtocolVersions.map((version) => row.results[version]),
  ]);
  const widths = headers.map((header, index) =>
    Math.max(header.length, ...values.map((row) => (row[index] ?? "").length)),
  );
  const cell = (
    value: string,
    index: number,
    annotation?: Ansi.AnsiAnnotation,
  ) => {
    const aligned = Box.alignHoriz(
      Box.text(value),
      index === 0 ? Box.left : Box.center1,
      widths[index] ?? value.length,
    );
    return annotation === undefined
      ? aligned
      : Box.annotate(aligned, annotation);
  };
  const row = (
    values: ReadonlyArray<string>,
    annotations: ReadonlyArray<Ansi.AnsiAnnotation | undefined> = [],
  ) =>
    Box.punctuateH(
      values.map((value, index) => cell(value, index, annotations[index])),
      Box.top,
      Box.text(" │ ").pipe(Box.annotate(Ansi.brightBlack)),
    );
  const header = row(
    headers,
    headers.map(() => Ansi.bold),
  );
  const dataRows = rows.map((rowValue) =>
    row(
      [
        rowValue.scenario,
        ...supportedProtocolVersions.map(
          (version) => rowValue.results[version],
        ),
      ],
      [
        undefined,
        ...supportedProtocolVersions.map((version) =>
          statusAnnotation(rowValue.results[version]),
        ),
      ],
    ),
  );
  const table = Box.vcat(
    [
      header,
      Box.text("─".repeat(header.cols)).pipe(Box.annotate(Ansi.brightBlack)),
      ...dataRows,
    ],
    Box.left,
  );
  const passingCells = rows
    .flatMap((rowValue) => Object.values(rowValue.results))
    .filter((result) => result === "PASS").length;
  const totalCells = rows.length * supportedProtocolVersions.length;
  const summary = Box.text(
    `${passingCells}/${totalCells} adapter checks passing`,
  ).pipe(Box.annotate(passingCells === totalCells ? Ansi.green : Ansi.yellow));
  const report = Box.vcat(
    [Box.text("MCP conformance").pipe(Box.annotate(Ansi.bold)), table, summary],
    Box.left,
  ).pipe(
    Box.pad(0, 2),
    Box.border("rounded", { annotation: Ansi.brightBlack }),
  );

  return process.stdout.isTTY
    ? Box.renderPrettySync(report)
    : Box.renderPlainSync(report);
};

export const all = Command.make(
  "all",
  { selectedScenario, timeout },
  ({ selectedScenario, timeout }) =>
    Effect.gen(function* () {
      const selected = Option.match(selectedScenario, {
        onNone: () => scenarios,
        onSome: (name) => {
          const scenario = findScenario(name);
          return scenario === undefined ? [] : [scenario];
        },
      });

      if (Option.isSome(selectedScenario) && selected.length === 0) {
        return yield* new UnknownScenario({ scenario: selectedScenario.value });
      }

      const rows = yield* Effect.forEach(selected, (scenario) =>
        Effect.forEach(supportedProtocolVersions, (protocol) =>
          runCell(scenario, protocol, timeout).pipe(
            Effect.map((result) => [protocol, result] as const),
          ),
        ).pipe(
          Effect.map((results): Row => ({
            scenario: scenario.name,
            results: Object.fromEntries(results) as Record<
              ProtocolVersion,
              Result
            >,
          })),
        ),
      );

      yield* Console.log(formatTable(rows));
      if (
        rows.some((row) =>
          Object.values(row.results).some(
            (result) => result === "FAIL" || result === "TIMEOUT",
          ),
        )
      ) {
        process.exitCode = 1;
      }
    }),
).pipe(
  Command.withDescription(
    "Run every scenario against each supported protocol adapter",
  ),
);
