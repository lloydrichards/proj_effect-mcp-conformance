import { Schema } from "effect";

const CheckStatuses = Schema.Array(
  Schema.Struct({
    id: Schema.String,
    status: Schema.Literals([
      "SUCCESS",
      "FAILURE",
      "WARNING",
      "SKIPPED",
      "INFO",
    ]),
  }),
);

export const skippedExitCode = 77;

export const resultExitCode = (runnerExitCode: number, checks: unknown) => {
  if (runnerExitCode !== 0) return runnerExitCode;
  const statuses = Schema.decodeUnknownSync(CheckStatuses)(checks);
  if (statuses.some((check) => check.status === "FAILURE")) return 1;
  // The runner appends this check even when every scenario behavior is skipped.
  const behavioralChecks = statuses.filter(
    (check) => check.id !== "wire-schema-valid",
  );
  if (behavioralChecks.length === 0) return 1;
  return behavioralChecks.every(
    (check) => check.status === "SKIPPED" || check.status === "INFO",
  )
    ? skippedExitCode
    : 0;
};
