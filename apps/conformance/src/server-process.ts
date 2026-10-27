import { Config, Console, Data, Deferred, Effect, Stream } from "effect";
import { ChildProcess } from "effect/process";
import type { ProtocolVersion } from "@repo/mcp-fixture";
import { repository } from "./repository";

export class ServerStartupError extends Data.TaggedError("ServerStartupError")<{
  readonly message: string;
}> {}

export const serverUrlFromLog = (line: string): string | undefined => {
  const match = /Listening on http:\/\/127\.0\.0\.1:(\d+)(?:\s|$)/.exec(line);
  if (match === null) return undefined;
  const port = Number(match[1]);
  return port > 0 && port <= 65535 ? `http://127.0.0.1:${port}/mcp` : undefined;
};

export const startServer = (
  entrypoint: string,
  protocols?: ReadonlyArray<ProtocolVersion>,
) =>
  Effect.gen(function* () {
    const port = yield* Config.String("MCP_PORT").pipe(Config.withDefault("0"));
    const ready = yield* Deferred.make<string, ServerStartupError>();
    const handle = yield* Effect.acquireRelease(
      ChildProcess.make("bun", ["run", entrypoint], {
        cwd: repository,
        env: {
          MCP_HOST: "127.0.0.1",
          MCP_PORT: port,
          ...(protocols === undefined
            ? {}
            : { MCP_PROTOCOLS: protocols.join(",") }),
        },
        extendEnv: true,
        stderr: "inherit",
        stdout: "pipe",
      }),
      (handle) =>
        handle.kill({ forceKillAfter: "5 seconds" }).pipe(Effect.ignore),
    );
    // Every fixture uses HttpServer.withLogAddress after installing its routes.
    yield* handle.stdout.pipe(
      Stream.decodeText(),
      Stream.splitLines,
      Stream.runForEach((line) =>
        Effect.gen(function* () {
          yield* Console.log(line);
          const url = serverUrlFromLog(line);
          if (url !== undefined) yield* Deferred.succeed(ready, url);
        }),
      ),
      Effect.catch((error) =>
        Deferred.fail(
          ready,
          new ServerStartupError({ message: String(error) }),
        ),
      ),
      Effect.forkScoped,
    );
    return yield* Deferred.await(ready).pipe(
      Effect.raceFirst(
        handle.exitCode.pipe(
          Effect.flatMap((exitCode) =>
            Effect.fail(
              new ServerStartupError({
                message: `Server exited with code ${exitCode} before reporting its listening address`,
              }),
            ),
          ),
        ),
      ),
      Effect.timeout("5 seconds"),
    );
  });
