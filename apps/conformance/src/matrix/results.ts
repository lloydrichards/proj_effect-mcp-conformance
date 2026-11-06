import { resultExitCode, skippedExitCode } from "../results";
import { Schema } from "effect";
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";

const Check = Schema.Struct({
  id: Schema.String,
  status: Schema.Literals(["SUCCESS", "FAILURE", "WARNING", "SKIPPED", "INFO"]),
});
const Checks = Schema.Array(Check);
export type Check = typeof Check.Type;
export type CellStatus = "PASS" | "FAIL" | "TIMEOUT" | "SKIP";

export const classifyResult = (
  exitCode: number | null,
  timedOut: boolean,
  checks: ReadonlyArray<Check>,
): CellStatus => {
  if (timedOut) return "TIMEOUT";
  if (exitCode === null) return "FAIL";
  const result = resultExitCode(
    exitCode === skippedExitCode ? 0 : exitCode,
    checks,
  );
  return result === skippedExitCode ? "SKIP" : result === 0 ? "PASS" : "FAIL";
};

export const readChecks = (directory: string): ReadonlyArray<Check> => {
  const paths = readdirSync(directory, { recursive: true }).filter((path) =>
    String(path).endsWith("checks.json"),
  );
  return paths.flatMap((path) =>
    Schema.decodeUnknownSync(Checks)(
      JSON.parse(readFileSync(join(directory, String(path)), "utf8")),
    ),
  );
};
