import { BunRuntime } from "@effect/platform-bun";
import { Effect, Schema, Stream } from "effect";
import { McpClient, Tool } from "effect/ai";
import { FetchHttpClient } from "effect/http";
import { FixtureError, runnerConfiguration } from "@repo/mcp-fixture/client";

const main = Effect.gen(function* () {
  const { url, protocol } = yield* runnerConfiguration;
  const transport = yield* McpClient.http({ url, protocol });
  const client = yield* McpClient.make({
    name: "effect-toolkit-client",
    version: "0.0.0",
    timeout: "10 seconds",
  }).pipe(Effect.provideService(McpClient.Transport, transport));
  const toolkit = yield* McpClient.toolkit(client, "mcp__");
  const tool = toolkit.tools["mcp__json_schema_2020_12_tool"];
  if (tool === undefined)
    return yield* new FixtureError({
      message: "Missing schema preservation tool",
    });
  const schema = yield* Schema.decodeUnknownEffect(Schema.JsonObject)(
    Tool.getJsonSchema(tool),
  );
  yield* toolkit
    .handle("mcp__json_schema_echo", { schema })
    .pipe(Effect.flatMap(Stream.runDrain));
});

main.pipe(
  Effect.scoped,
  Effect.provide(FetchHttpClient.layer),
  BunRuntime.runMain,
);
