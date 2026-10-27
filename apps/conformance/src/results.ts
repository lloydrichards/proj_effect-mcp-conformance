import { Schema } from "effect";

const CheckStatuses = Schema.Array(Schema.Struct({ status: Schema.String }));

export const skippedExitCode = 77;

export const resultExitCode = (runnerExitCode: number, checks: unknown) => {
  const statuses = Schema.decodeUnknownSync(CheckStatuses)(checks);
  if (runnerExitCode !== 0) return runnerExitCode;
  return statuses.length > 0 &&
    statuses.every(
      (check) => check.status === "SKIPPED" || check.status === "INFO",
    )
    ? skippedExitCode
    : 0;
};
