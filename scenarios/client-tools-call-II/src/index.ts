import { BunRuntime } from "@effect/platform-bun";
import { Effect, Layer } from "effect";
import { McpClient } from "effect/ai";
import { FetchHttpClient } from "effect/http";
import { FixtureError, runnerConfiguration } from "@repo/mcp-fixture/client";

const workload = Effect.gen(function* () {
  const client = yield* McpClient.McpClient;
  const tools = yield* client.listTools();
  const tool = tools[0];
  if (tool === undefined)
    return yield* new FixtureError({ message: "No tool advertised" });
  yield* client.callTool({ tool, arguments: { a: 2, b: 3 } });
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
