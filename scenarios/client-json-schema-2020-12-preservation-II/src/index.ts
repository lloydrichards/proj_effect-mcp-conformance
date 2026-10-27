import { BunRuntime } from "@effect/platform-bun";
import { Effect, Layer } from "effect";
import { McpClient } from "effect/ai";
import { FetchHttpClient } from "effect/http";
import { FixtureError, runnerConfiguration } from "@repo/mcp-fixture/client";

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
  const focal = yield* findTool("json_schema_2020_12_tool");
  const tool = yield* findTool("json_schema_echo");
  yield* client.callTool({ tool, arguments: { schema: focal.inputSchema } });
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
