import * as Ansi from "effect-boxes/Ansi";
import * as Box from "effect-boxes/Box";
import {
  supportedProtocolVersions,
  type ProtocolVersion,
} from "@repo/mcp-fixture";
import type { CellStatus } from "./results";

type Result = CellStatus | " -- ";
export interface Row {
  readonly scenario: string;
  readonly results: Readonly<Record<ProtocolVersion, Result>>;
}

const statusAnnotation = (result: Result) => {
  switch (result) {
    case "PASS":
      return Ansi.green;
    case "FAIL":
      return Ansi.red;
    case "TIMEOUT":
      return Ansi.yellow;
    case "SKIP":
    case " -- ":
      return Ansi.brightBlack;
  }
};

export const formatTable = (rows: ReadonlyArray<Row>) => {
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
  const statuses = rows.flatMap((row) => Object.values(row.results));
  const totalCells = statuses.filter((status) => status !== " -- ").length;
  const skipped = statuses.filter((status) => status === "SKIP").length;
  const summary = Box.text(
    `${passingCells}/${totalCells} applicable checks passing; ${skipped} skipped`,
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
