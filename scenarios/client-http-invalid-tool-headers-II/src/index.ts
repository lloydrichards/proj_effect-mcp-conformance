import { BunRuntime } from "@effect/platform-bun";
import { Effect, Layer } from "effect";
import { McpClient } from "effect/ai";
import { FetchHttpClient } from "effect/http";
import { runnerConfiguration } from "@repo/mcp-fixture/client";

const workload = Effect.gen(function* () {
  const client = yield* McpClient.McpClient;
  const tools = yield* client.listTools();
  // Call every retained tool so discovery filtering owns rejection.
  for (const tool of tools)
    yield* client.callTool({ tool, arguments: { region: "us-west1" } });
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
