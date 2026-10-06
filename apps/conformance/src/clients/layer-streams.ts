import { BunRuntime } from "@effect/platform-bun";
import { Config, Effect, Layer, Schema, Stream } from "effect";
import { McpClient, McpClientTransport, McpSchema } from "effect/ai";
import { FetchHttpClient } from "effect/http";
import { FixtureError, RunnerContext, runnerConfiguration } from "./runtime";

// This implementation constructs the connection with Layers and discovers
// definitions through the client's paginated streams rather than list methods.
const main = Effect.gen(function* () {
  const { scenario, url, protocol } = yield* runnerConfiguration;
  const ClientLive = McpClient.layer({
    protocol,
    clientInfo: { name: "effect-layer-stream-client", version: "0.0.0" },
    timeout: "10 seconds",
    handlers:
      scenario === "elicitation-sep1034-client-defaults"
        ? {
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
          }
        : {},
  }).pipe(
    Layer.provide(McpClientTransport.layerHttp({ url, protocol })),
    Layer.provide(FetchHttpClient.layer),
  );

  const workload = Effect.gen(function* () {
    const client = yield* McpClient.McpClient;
    if (scenario === "initialize") return;
    if (scenario === "request-metadata") {
      yield* client.request("server/discover");
      return;
    }
    const tools = yield* Stream.runCollect(client.tools);
    const findTool = (name: string) =>
      Effect.suspend(() => {
        const tool = tools.find((tool) => tool.name === name);
        return tool === undefined
          ? Effect.fail(new FixtureError({ message: `Missing tool ${name}` }))
          : Effect.succeed(tool);
      });
    switch (scenario) {
      case "tools_call": {
        const tool = tools[0];
        if (tool === undefined)
          return yield* new FixtureError({ message: "No tool advertised" });
        yield* client.callTool({ tool, arguments: { a: 2, b: 3 } });
        break;
      }
      case "json-schema-ref-no-deref":
        break;
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
      case "http-invalid-tool-headers":
        for (const tool of tools)
          yield* client.callTool({ tool, arguments: { region: "us-west1" } });
        break;
      case "http-standard-headers":
        yield* Effect.forEach(
          tools,
          (tool) => client.callTool({ tool, arguments: {} }),
          { concurrency: 2, discard: true },
        );
        yield* Stream.runForEach(client.resources, (resource) =>
          client.readResource({ uri: resource.uri }),
        );
        yield* Stream.runForEach(client.prompts, (prompt) =>
          client.getPrompt({ name: prompt.name }),
        );
        break;
      case "http-custom-headers": {
        const context = yield* Config.String("MCP_CONFORMANCE_CONTEXT").pipe(
          Effect.flatMap(
            Schema.decodeUnknownEffect(Schema.fromJsonString(RunnerContext)),
          ),
        );
        yield* Effect.forEach(
          context.toolCalls,
          (call) =>
            Effect.gen(function* () {
              const tool = yield* findTool(call.name);
              yield* client.callTool({ tool, arguments: call.arguments });
            }),
          { concurrency: 2, discard: true },
        );
        break;
      }
      default:
        return yield* new FixtureError({
          message: `Unsupported layer-stream scenario ${scenario}`,
        });
    }
  });
  yield* workload.pipe(Effect.provide(ClientLive));
});

BunRuntime.runMain(main);
