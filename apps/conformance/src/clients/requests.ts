import { BunRuntime } from "@effect/platform-bun";
import { Effect, Schema } from "effect";
import { McpClient, McpClientTransport, McpSchema } from "effect/ai";
import { FetchHttpClient } from "effect/http";
import { FixtureError, runnerConfiguration } from "./runtime";

// Generic requests exercise caller-side result decoding. Modern HTTP tool
// invocation is excluded because requestOnce cannot supply a tool definition.
const main = Effect.gen(function* () {
  const { scenario, url, protocol } = yield* runnerConfiguration;
  const transport = yield* McpClientTransport.http({ url, protocol });
  const client = yield* McpClient.make({
    protocol,
    clientInfo: { name: "effect-request-client", version: "0.0.0" },
    timeout: "10 seconds",
  }).pipe(Effect.provideService(McpClientTransport.Transport, transport));
  if (scenario === "initialize") return;
  if (scenario === "request-metadata") {
    yield* client.requestOnce("server/discover");
    return;
  }
  const list = yield* client
    .requestOnce("tools/list")
    .pipe(
      Effect.flatMap(Schema.decodeUnknownEffect(McpSchema.ListToolsResult)),
    );
  const call = (name: string, args: Schema.JsonObject = {}) =>
    client.requestOnce("tools/call", { name, arguments: args });
  switch (scenario) {
    case "tools_call": {
      const tool = list.tools[0];
      if (tool === undefined)
        return yield* new FixtureError({ message: "No tool advertised" });
      yield* call(tool.name, { a: 2, b: 3 }).pipe(
        Effect.flatMap(Schema.decodeUnknownEffect(McpSchema.CallToolResult)),
      );
      break;
    }
    case "json-schema-ref-no-deref":
      break;
    case "json-schema-2020-12-preservation": {
      const focal = list.tools.find(
        (tool) => tool.name === "json_schema_2020_12_tool",
      );
      if (focal === undefined)
        return yield* new FixtureError({
          message: "Missing schema preservation tool",
        });
      yield* call("json_schema_echo", { schema: focal.inputSchema });
      break;
    }
    default:
      return yield* new FixtureError({
        message: `Unsupported request scenario ${scenario}`,
      });
  }
});

main.pipe(
  Effect.scoped,
  Effect.provide(FetchHttpClient.layer),
  BunRuntime.runMain,
);
