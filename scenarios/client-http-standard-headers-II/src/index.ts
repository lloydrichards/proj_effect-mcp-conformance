import { BunRuntime } from "@effect/platform-bun";
import { Effect, Layer } from "effect";
import { McpClient } from "effect/ai";
import { FetchHttpClient } from "effect/http";
import { runnerConfiguration } from "@repo/mcp-fixture/client";

const workload = Effect.gen(function* () {
  const client = yield* McpClient.McpClient;
  const tools = yield* client.listTools();
  yield* Effect.forEach(
    tools,
    (tool) => client.callTool({ tool, arguments: {} }),
    { concurrency: 2, discard: true },
  );
  yield* Effect.forEach(
    yield* client.listResources(),
    (resource) => client.readResource({ uri: resource.uri }),
    { concurrency: 2, discard: true },
  );
  yield* Effect.forEach(
    yield* client.listPrompts(),
    (prompt) => client.getPrompt({ prompt }),
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
