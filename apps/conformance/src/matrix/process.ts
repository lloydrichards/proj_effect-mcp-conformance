import { Effect, Option, Stream } from "effect";
import { ChildProcess } from "effect/process";
import { appendFileSync } from "node:fs";

export const runProcess = (
  args: ReadonlyArray<string>,
  cwd: string,
  log: string,
  timeout: number,
) =>
  Effect.scoped(
    Effect.gen(function* () {
      const handle = yield* Effect.acquireRelease(
        ChildProcess.make("bun", args, {
          cwd,
          extendEnv: true,
          stdout: "pipe",
          stderr: "pipe",
        }),
        (handle) =>
          handle.kill({ forceKillAfter: "2 seconds" }).pipe(Effect.ignore),
      );
      const logOutput = (stream: typeof handle.stdout) =>
        Stream.runForEach(stream, (chunk) =>
          Effect.sync(() => appendFileSync(log, chunk)),
        );
      const result = yield* Effect.all(
        [handle.exitCode, logOutput(handle.stdout), logOutput(handle.stderr)],
        { concurrency: "unbounded" },
      ).pipe(Effect.timeoutOption(timeout));
      return Option.match(result, {
        onNone: () => ({ exitCode: null, timedOut: true }),
        onSome: ([exitCode]) => ({
          exitCode: Number(exitCode),
          timedOut: false,
        }),
      });
    }),
  );
