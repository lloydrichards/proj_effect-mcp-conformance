import { startServer } from "../server-process";
import { repository } from "../repository";
import { Console, Data, Effect, Option } from "effect";
import { Argument, Command, Flag } from "effect/cli";
import { ChildProcess } from "effect/process";
import { entrypointFor, findScenario, scenarioNames } from "../scenarios";
import { supportedProtocolVersions } from "@repo/mcp-fixture";

const scenario = Argument.String("scenario").pipe(
  Argument.withDescription("Scenario server to open in the MCP Inspector"),
);

const protocol = Flag.Literals("protocol", supportedProtocolVersions).pipe(
  Flag.optional,
  Flag.withDescription("Protocol adapter configured for the server"),
);

class UnknownScenario extends Data.TaggedError("UnknownScenario")<{
  readonly scenario: string;
}> {}

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

        const url = yield* startServer(
          entrypointFor(scenarioDefinition),
          Option.isSome(protocol) ? [protocol.value] : undefined,
        );
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
