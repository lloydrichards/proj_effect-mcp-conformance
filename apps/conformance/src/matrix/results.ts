import { resultExitCode, skippedExitCode, type Check } from "../results";

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
