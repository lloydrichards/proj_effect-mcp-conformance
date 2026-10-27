import { BunRuntime } from "@effect/platform-bun";
import { Effect, Layer } from "effect";
import { McpClient } from "effect/ai";
import { FetchHttpClient } from "effect/http";
import { runnerConfiguration } from "@repo/mcp-fixture/client";

// Connecting completes initialize and notifications/initialized.
const workload = Effect.asVoid(McpClient.McpClient);

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
