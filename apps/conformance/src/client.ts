import { BunRuntime } from "@effect/platform-bun";
import { Config, Data, Effect, Schema } from "effect";
import {
  McpClient,
  McpClientTransport,
  McpProtocol,
  McpSchema,
} from "effect/ai";
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
  const transport = yield* McpClientTransport.http({ url, protocol });
  const client = yield* McpClient.make({
    protocol,
    clientInfo: { name: "effect-conformance-client", version: "0.0.0" },
    timeout: "10 seconds",
    handlers:
      version === "2025-11-25" &&
      scenario !== "elicitation-sep1034-client-defaults"
        ? {}
        : {
            elicitation: {
              form: (request) =>
                Effect.succeed(
                  new McpSchema.ElicitAcceptResult({
                    action: "accept",
                    content: McpClient.getElicitationFormDefaults(
                      request.requestedSchema,
                    ),
                  }),
                ),
            },
          },
  }).pipe(Effect.provideService(McpClientTransport.Transport, transport));

  if (scenario === "initialize") return;
  if (scenario === "request-metadata") {
    // This peer advertises no tools. Probe ordinary request metadata through discovery.
    yield* client.request("server/discover");
    return;
  }
  const list = yield* client.listTools();
  const findTool = (name: string) =>
    Effect.suspend(() => {
      const tool = list.tools.find((tool) => tool.name === name);
      return tool === undefined
        ? Effect.fail(
            new FixtureError({ message: `Server did not advertise ${name}` }),
          )
        : Effect.succeed(tool);
    });

  switch (scenario) {
    case "tools_call": {
      const tool = list.tools[0];
      if (tool !== undefined)
        yield* client.callTool({ tool, arguments: { a: 2, b: 3 } });
      break;
    }
    case "json-schema-ref-no-deref":
      break;
    case "http-invalid-tool-headers": {
      // Call everything the client retained, so filtering owns rejection.
      for (const tool of list.tools)
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
    case "elicitation-sep1034-client-defaults": {
      const tool = yield* findTool("test_client_elicitation_defaults");
      yield* client.callTool({ tool, arguments: {} });
      break;
    }
    case "sep-2322-client-request-state": {
      for (const name of [
        "test_mrtr_echo_state",
        "test_mrtr_unrelated",
        "test_mrtr_no_state",
        "test_mrtr_no_result_type",
      ]) {
        const tool = yield* findTool(name);
        yield* client.callTool({ tool, arguments: {} });
      }
      break;
    }
    case "http-standard-headers": {
      for (const tool of list.tools)
        yield* client.callTool({ tool, arguments: {} });
      const resources = yield* client.listResources();
      for (const resource of resources.resources)
        yield* client.readResource({ uri: resource.uri });
      const prompts = yield* client.listPrompts();
      for (const prompt of prompts.prompts)
        yield* client.getPrompt({ name: prompt.name });
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
