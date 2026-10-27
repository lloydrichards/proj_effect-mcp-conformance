import { BunRuntime } from "@effect/platform-bun";
import { Config, Effect, Schema, Layer } from "effect";
import { McpClient } from "effect/ai";
import { FetchHttpClient } from "effect/http";
import { FixtureError, runnerConfiguration } from "@repo/mcp-fixture/client";

const RunnerContext = Schema.Struct({
  toolCalls: Schema.Array(
    Schema.Struct({ name: Schema.String, arguments: Schema.JsonObject }),
  ),
});

const workload = Effect.gen(function* () {
  const client = yield* McpClient.McpClient;
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
  yield* Effect.forEach(
    context.toolCalls,
    (call) =>
      Effect.gen(function* () {
        const tool = yield* findTool(call.name);
        yield* client.callTool({ tool, arguments: call.arguments });
      }),
    { concurrency: 2, discard: true },
  );
});

const main = Effect.gen(function* () {
  const { url, protocol } = yield* runnerConfiguration;
  const ClientLive = McpClient.layerHttp({
    name: "effect-layer-client",
    version: "0.0.0",
    url,
    protocol,
    timeout: "10 seconds",
  }).pipe(Layer.provide(FetchHttpClient.layer));
  yield* workload.pipe(Effect.provide(ClientLive));
});

BunRuntime.runMain(main);
