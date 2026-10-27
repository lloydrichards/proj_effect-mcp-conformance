import { BunRuntime } from "@effect/platform-bun";
import { Config, Effect, Schema, Stream } from "effect";
import { McpClient } from "effect/ai";
import { FetchHttpClient } from "effect/http";
import { runnerConfiguration } from "@repo/mcp-fixture/client";

const RunnerContext = Schema.Struct({
  toolCalls: Schema.Array(
    Schema.Struct({ name: Schema.String, arguments: Schema.JsonObject }),
  ),
});

const main = Effect.gen(function* () {
  const { url, protocol } = yield* runnerConfiguration;
  const transport = yield* McpClient.http({ url, protocol });
  const client = yield* McpClient.make({
    name: "effect-toolkit-client",
    version: "0.0.0",
    timeout: "10 seconds",
  }).pipe(Effect.provideService(McpClient.Transport, transport));
  const toolkit = yield* McpClient.toolkit(client, "mcp__");
  const context = yield* Config.String("MCP_CONFORMANCE_CONTEXT").pipe(
    Effect.flatMap(
      Schema.decodeUnknownEffect(Schema.fromJsonString(RunnerContext)),
    ),
  );
  for (const call of context.toolCalls)
    yield* toolkit
      .handle(`mcp__${call.name}`, call.arguments)
      .pipe(Effect.flatMap(Stream.runDrain));
});

main.pipe(
  Effect.scoped,
  Effect.provide(FetchHttpClient.layer),
  BunRuntime.runMain,
);
