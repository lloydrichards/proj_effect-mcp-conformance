import { Console, Data, Effect, Option } from "effect";
import { Argument, Command, Flag } from "effect/unstable/cli";
import { ChildProcess } from "effect/unstable/process";
import { entrypointFor, findScenario, scenarioNames } from "../scenarios";
import { supportedProtocolVersions } from "@repo/mcp-fixture";

const scenario = Argument.string("scenario").pipe(
  Argument.withDescription("Scenario server to open in the MCP Inspector"),
);

const protocol = Flag.choice("protocol", supportedProtocolVersions).pipe(
  Flag.optional,
  Flag.withDescription("Protocol adapter configured for the server"),
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

export const inspect = Command.make(
  "inspect",
  { scenario, protocol },
  ({ scenario, protocol }) =>
    Effect.scoped(
      Effect.gen(function* () {
        const scenarioDefinition = findScenario(scenario);
        if (scenarioDefinition === undefined) {
          yield* Console.error(
            `Unknown scenario ${JSON.stringify(scenario)}. ` +
              `Choose one of: ${scenarioNames.join(", ")}.`,
          );
          return yield* new UnknownScenario({ scenario });
        }

        if (
          Option.isSome(protocol) &&
          !scenarioDefinition.protocolVersions.includes(protocol.value)
        ) {
          return yield* new UnknownScenario({
            scenario: `${scenario} is not supported for ${protocol.value}`,
          });
        }

        const port =
          process.env["MCP_PORT"] ??
          String(20_000 + Math.floor(Math.random() * 20_000));
        const url = `http://127.0.0.1:${port}/mcp`;

        yield* Effect.acquireRelease(
          ChildProcess.make("bun", ["run", entrypointFor(scenarioDefinition)], {
            cwd: repository,
            env: {
              MCP_HOST: "127.0.0.1",
              MCP_PORT: port,
              ...(Option.isSome(protocol)
                ? { MCP_PROTOCOLS: protocol.value }
                : {}),
            },
            extendEnv: true,
            stderr: "inherit",
            stdout: "inherit",
          }),
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
  Command.withDescription("Open one MCP server scenario in the Inspector"),
);
