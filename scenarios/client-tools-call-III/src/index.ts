import { BunRuntime } from "@effect/platform-bun";
import { Effect, Stream } from "effect";
import { McpClient } from "effect/ai";
import { FetchHttpClient } from "effect/http";
import { runnerConfiguration } from "@repo/mcp-fixture/client";

const main = Effect.gen(function* () {
  const { url, protocol } = yield* runnerConfiguration;
  const transport = yield* McpClient.http({ url, protocol });
  const client = yield* McpClient.make({
    name: "effect-toolkit-client",
    version: "0.0.0",
    timeout: "10 seconds",
  }).pipe(Effect.provideService(McpClient.Transport, transport));
  const toolkit = yield* McpClient.toolkit(client, "mcp__");
  yield* toolkit
    .handle("mcp__add_numbers", { a: 2, b: 3 })
    .pipe(Effect.flatMap(Stream.runDrain));
});

main.pipe(
  Effect.scoped,
  Effect.provide(FetchHttpClient.layer),
  BunRuntime.runMain,
);
