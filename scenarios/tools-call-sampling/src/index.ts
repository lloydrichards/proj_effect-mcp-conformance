import { BunHttpServer, BunRuntime } from "@effect/platform-bun";
import { Context, Effect, Layer, Option } from "effect";
import { McpSchema, McpServer } from "effect/ai";
import { HttpRouter, HttpServer } from "effect/http";
import { McpProtocolConfig, McpServerConfig } from "@repo/mcp-fixture";

const SamplingTool = new McpSchema.Tool({
  name: "test_sampling",
  description: "Requests a sampled response from the client.",
  inputSchema: {
    type: "object",
    properties: { prompt: { type: "string" } },
    required: ["prompt"],
  },
});

const samplingHandler = (arguments_: Readonly<Record<string, unknown>>) =>
  Effect.scoped(
    Effect.gen(function* () {
      const serverClient = yield* Effect.serviceOption(
        McpSchema.McpServerClient,
      );
      if (Option.isNone(serverClient)) {
        return yield* new McpSchema.InternalError({
          message: "Sampling requires an initialized MCP session",
        });
      }
      const client = yield* serverClient.value.getClient;
      yield* client
        .createMessage({
          messages: [
            {
              role: "user",
              content: {
                type: "text",
                text: String(arguments_["prompt"]),
              },
            },
          ],
          maxTokens: 32,
        })
        .pipe(
          Effect.mapError(
            (error) =>
              new McpSchema.InternalError({ message: error.operation }),
          ),
        );
      return new McpSchema.CallToolResult({
        content: [{ type: "text", text: "Sampling completed" }],
      });
    }),
  );

const SamplingRegistration = Layer.effectDiscard(
  McpServer.McpServer.use((mcp) =>
    mcp.addTool({
      tool: SamplingTool,
      annotations: Context.empty(),
      handle: samplingHandler,
    }),
  ),
);

const McpHttpLive = Effect.map(
  McpProtocolConfig,
  ({ protocols, allowedOrigins }) =>
    McpServer.layerHttp({
      name: "Effect MCP fixture: tools-call-sampling",
      version: "0.1.0",
      path: "/mcp",
      protocols,
      allowedOrigins,
    }),
).pipe(Layer.unwrap);

const ScenarioLive = SamplingRegistration.pipe(Layer.provideMerge(McpHttpLive));

const MainLive = ScenarioLive.pipe(
  HttpRouter.serve,
  HttpServer.withLogAddress,
  Layer.provide(BunHttpServer.layerConfig(McpServerConfig)),
);

const main = Layer.launch(MainLive).pipe(Effect.satisfiesServicesType<never>());

BunRuntime.runMain(main);
