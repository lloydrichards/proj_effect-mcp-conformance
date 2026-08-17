import { BunHttpServer, BunRuntime } from "@effect/platform-bun";
import { Context, Effect, Layer } from "effect";
import { McpSchema, McpServer } from "effect/unstable/ai";
import { HttpRouter, HttpServer } from "effect/unstable/http";
import { McpServerConfig, server } from "@repo/mcp-fixture";

const scenario = Layer.effectDiscard(
  Effect.gen(function* () {
    const mcp = yield* McpServer.McpServer;
    yield* mcp.addTool({
      tool: new McpSchema.Tool({
        name: "test_sampling",
        description: "Requests a sampled response from the client.",
        inputSchema: {
          type: "object",
          properties: { prompt: { type: "string" } },
          required: ["prompt"],
        },
      }),
      annotations: Context.empty(),
      handle: (arguments_) =>
        Effect.scoped(
          Effect.gen(function* () {
            const client = yield* (yield* McpSchema.McpServerClient).getClient;
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
        ),
    });
  }),
).pipe(Layer.provideMerge(server("tools-call-sampling")));
const program = scenario.pipe(
  HttpRouter.serve,
  HttpServer.withLogAddress,
  Layer.provide(BunHttpServer.layerConfig(McpServerConfig)),
  Layer.launch,
  Effect.satisfiesServicesType<never>(),
);
BunRuntime.runMain(program);
