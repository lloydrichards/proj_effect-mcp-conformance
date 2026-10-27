import { BunRuntime } from "@effect/platform-bun";
import { Config, Effect, Schema } from "effect";
import { McpClient } from "effect/ai";
import { FetchHttpClient } from "effect/http";
import { FixtureError, runnerConfiguration } from "@repo/mcp-fixture/client";

const RunnerContext = Schema.Struct({
  toolCalls: Schema.Array(
    Schema.Struct({ name: Schema.String, arguments: Schema.JsonObject }),
  ),
});

const main = Effect.gen(function* () {
  const { url, protocol } = yield* runnerConfiguration;
  const transport = yield* McpClient.http({ url, protocol });
  const client = yield* McpClient.make({
    name: "effect-conformance-client",
    version: "0.0.0",
    timeout: "10 seconds",
  }).pipe(Effect.provideService(McpClient.Transport, transport));
  const tools = yield* client.listTools();
  const findTool = (name: string) =>
    Effect.suspend(() => {
      const tool = tools.find((tool) => tool.name === name);
      return tool === undefined
        ? Effect.fail(
            new FixtureError({ message: `Server did not advertise ${name}` }),
          )
        : Effect.succeed(tool);
    });
  const context = yield* Config.String("MCP_CONFORMANCE_CONTEXT").pipe(
    Effect.flatMap(
      Schema.decodeUnknownEffect(Schema.fromJsonString(RunnerContext)),
    ),
  );
  for (const call of context.toolCalls) {
    const tool = yield* findTool(call.name);
    yield* client.callTool({ tool, arguments: call.arguments });
  }
});

main.pipe(
  Effect.scoped,
  Effect.provide(FetchHttpClient.layer),
  BunRuntime.runMain,
);
