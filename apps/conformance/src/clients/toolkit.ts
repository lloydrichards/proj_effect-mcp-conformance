import { BunRuntime } from "@effect/platform-bun";
import { Config, Effect, Schema, Stream } from "effect";
import { McpClient, Tool } from "effect/ai";
import { FetchHttpClient } from "effect/http";
import { FixtureError, RunnerContext, runnerConfiguration } from "./runtime";

// Dispatch through the model toolkit with prefixed names, preserving the
// discovered definitions used by the HTTP transport for parameter headers.
const main = Effect.gen(function* () {
  const { scenario, url, protocol } = yield* runnerConfiguration;
  const transport = yield* McpClient.http({ url, protocol });
  const client = yield* McpClient.make({
    name: "effect-toolkit-client",
    version: "0.0.0",
    timeout: "10 seconds",
  }).pipe(Effect.provideService(McpClient.Transport, transport));
  const toolkit = yield* McpClient.toolkit(client, "mcp__");
  const call = (name: string, args: Schema.JsonObject) =>
    toolkit.handle(`mcp__${name}`, args).pipe(Effect.flatMap(Stream.runDrain));

  switch (scenario) {
    case "tools_call":
      yield* call("add_numbers", { a: 2, b: 3 });
      break;
    case "json-schema-ref-no-deref":
      break;
    case "json-schema-2020-12-preservation": {
      const tool = toolkit.tools["mcp__json_schema_2020_12_tool"];
      if (tool === undefined)
        return yield* new FixtureError({
          message: "Missing schema preservation tool",
        });
      const schema = yield* Schema.decodeUnknownEffect(Schema.JsonObject)(
        Tool.getJsonSchema(tool),
      );
      yield* call("json_schema_echo", { schema });
      break;
    }
    case "http-custom-headers": {
      const context = yield* Config.String("MCP_CONFORMANCE_CONTEXT").pipe(
        Effect.flatMap(
          Schema.decodeUnknownEffect(Schema.fromJsonString(RunnerContext)),
        ),
      );
      for (const probe of context.toolCalls)
        yield* call(probe.name, probe.arguments);
      break;
    }
    default:
      return yield* new FixtureError({
        message: `Unsupported toolkit scenario ${scenario}`,
      });
  }
});

main.pipe(
  Effect.scoped,
  Effect.provide(FetchHttpClient.layer),
  BunRuntime.runMain,
);
