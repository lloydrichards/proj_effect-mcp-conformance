import { BunRuntime } from "@effect/platform-bun";
import { Config, Data, Effect, Schema } from "effect";
import { McpClient, McpProtocol } from "effect/ai";
import { FetchHttpClient } from "effect/http";

class FixtureError extends Data.TaggedError("FixtureError")<{
  readonly message: string;
}> {}

const RunnerContext = Schema.Struct({
  toolCalls: Schema.Array(
    Schema.Struct({ name: Schema.String, arguments: Schema.JsonObject }),
  ),
});

// The runner supplies the URL, scenario, protocol, and any parameter probes.
// Every exchange below uses the public Effect client and HTTP transport.
const main = Effect.gen(function* () {
  const scenario = yield* Config.String("MCP_CONFORMANCE_SCENARIO");
  const version = yield* Config.Literals(
    ["2025-11-25", "2026-07-28"],
    "MCP_CONFORMANCE_PROTOCOL_VERSION",
  );
  const url = process.argv[2];
  if (url === undefined)
    return yield* Effect.fail(
      new FixtureError({ message: "Missing server URL" }),
    );
  const protocol =
    version === "2026-07-28"
      ? McpProtocol.v2026_07_28
      : McpProtocol.v2025_11_25;
  const transport = yield* McpClient.http({ url, protocol });
  const client = yield* McpClient.make({
    name: "effect-conformance-client",
    version: "0.0.0",
    timeout: "10 seconds",
  }).pipe(Effect.provideService(McpClient.Transport, transport));

  if (scenario === "initialize") return;
  if (scenario === "request-metadata") return;
  const list = yield* client.listTools();
  const findTool = (name: string) =>
    Effect.suspend(() => {
      const tool = list.find((tool) => tool.name === name);
      return tool === undefined
        ? Effect.fail(
            new FixtureError({ message: `Server did not advertise ${name}` }),
          )
        : Effect.succeed(tool);
    });

  switch (scenario) {
    case "tools_call": {
      const tool = list[0];
      if (tool === undefined)
        return yield* new FixtureError({ message: "No tool advertised" });
      yield* client.callTool({ tool, arguments: { a: 2, b: 3 } });
      break;
    }
    case "json-schema-ref-no-deref":
      break;
    case "http-invalid-tool-headers": {
      // Call everything the client retained, so filtering owns rejection.
      for (const tool of list)
        yield* client.callTool({ tool, arguments: { region: "us-west1" } });
      break;
    }
    case "json-schema-2020-12-preservation": {
      const focal = yield* findTool("json_schema_2020_12_tool");
      const tool = yield* findTool("json_schema_echo");
      yield* client.callTool({
        tool,
        arguments: { schema: focal.inputSchema },
      });
      break;
    }
    case "http-standard-headers": {
      for (const tool of list) yield* client.callTool({ tool, arguments: {} });
      const resources = yield* client.listResources();
      for (const resource of resources)
        yield* client.readResource({ uri: resource.uri });
      const prompts = yield* client.listPrompts();
      for (const prompt of prompts) yield* client.getPrompt({ prompt });
      break;
    }
    case "http-custom-headers": {
      const context = yield* Config.String("MCP_CONFORMANCE_CONTEXT").pipe(
        Effect.flatMap(
          Schema.decodeUnknownEffect(Schema.fromJsonString(RunnerContext)),
        ),
      );
      for (const call of context.toolCalls) {
        const tool = yield* findTool(call.name);
        yield* client.callTool({ tool, arguments: call.arguments });
      }
      break;
    }
    default:
      return yield* Effect.fail(
        new FixtureError({
          message: `Unsupported client scenario: ${scenario}`,
        }),
      );
  }
});

main.pipe(
  Effect.scoped,
  Effect.provide(FetchHttpClient.layer),
  BunRuntime.runMain,
);
