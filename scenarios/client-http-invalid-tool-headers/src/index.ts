import { BunRuntime } from "@effect/platform-bun";
import { Effect } from "effect";
import { McpClient } from "effect/ai";
import { FetchHttpClient } from "effect/http";
import { runnerConfiguration } from "@repo/mcp-fixture/client";

const main = Effect.gen(function* () {
  const { url, protocol } = yield* runnerConfiguration;
  const transport = yield* McpClient.http({ url, protocol });
  const client = yield* McpClient.make({
    name: "effect-conformance-client",
    version: "0.0.0",
    timeout: "10 seconds",
  }).pipe(Effect.provideService(McpClient.Transport, transport));
  const tools = yield* client.listTools();
  // Call every retained tool so discovery filtering owns rejection.
  for (const tool of tools)
    yield* client.callTool({ tool, arguments: { region: "us-west1" } });
});

main.pipe(
  Effect.scoped,
  Effect.provide(FetchHttpClient.layer),
  BunRuntime.runMain,
);
