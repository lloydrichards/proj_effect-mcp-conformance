import { Console, Data, Effect } from "effect";
import { Argument, Command } from "effect/unstable/cli";
import { ChildProcess } from "effect/unstable/process";
import { scenarios } from "./run";

const scenario = Argument.string("scenario").pipe(
  Argument.withDescription("Scenario server to open in the MCP Inspector"),
);

const repository = new URL("../../../..", import.meta.url).pathname;

class UnknownScenario extends Data.TaggedError("UnknownScenario")<{
  readonly scenario: string;
}> {}

const waitForServer = (url: string) =>
  Effect.promise(async () => {
    for (let attempt = 0; attempt < 50; attempt++) {
      try {
        await fetch(url, { signal: AbortSignal.timeout(200) });
        return;
      } catch {
        if (attempt === 49) {
          throw new Error(`Server did not start at ${url}`);
        }
        await Bun.sleep(100);
      }
    }
  });

export const inspect = Command.make("inspect", { scenario }, ({ scenario }) =>
  Effect.scoped(
    Effect.gen(function* () {
      if (!scenarios.includes(scenario)) {
        yield* Console.error(
          `Unknown scenario ${JSON.stringify(scenario)}. ` +
            `Choose one of: ${scenarios.join(", ")}.`,
        );
        return yield* new UnknownScenario({ scenario });
      }

      const port =
        process.env["MCP_PORT"] ??
        String(20_000 + Math.floor(Math.random() * 20_000));
      const url = `http://127.0.0.1:${port}/mcp`;

      yield* Effect.acquireRelease(
        ChildProcess.make(
          "bun",
          ["run", `scenarios/${scenario}/src/index.ts`],
          {
            cwd: repository,
            env: { MCP_HOST: "127.0.0.1", MCP_PORT: port },
            extendEnv: true,
            stderr: "inherit",
            stdout: "inherit",
          },
        ),
        (handle) =>
          handle.kill({ forceKillAfter: "5 seconds" }).pipe(Effect.ignore),
      );

      yield* waitForServer(url);
      yield* Console.log(`Opening MCP Inspector for ${scenario} at ${url}`);
      const exitCode = yield* ChildProcess.make(
        "bunx",
        [
          "@modelcontextprotocol/inspector",
          "--server-url",
          url,
          "--transport",
          "http",
        ],
        {
          cwd: repository,
          extendEnv: true,
          stderr: "inherit",
          stdout: "inherit",
        },
      ).pipe(Effect.flatMap((handle) => handle.exitCode));
      process.exitCode = exitCode;
    }),
  ),
).pipe(
  Command.withDescription("Open one independent MCP scenario in the Inspector"),
);
