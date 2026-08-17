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
        name: "test_elicitation",
        description: "Requests user input from the client.",
        inputSchema: {
          type: "object",
          properties: { message: { type: "string" } },
          required: ["message"],
        },
      }),
      annotations: Context.empty(),
      handle: (arguments_) =>
        Effect.scoped(
          Effect.gen(function* () {
            const client = yield* (yield* McpSchema.McpServerClient).getClient;
            const result = yield* client
              .elicit({
                message: String(arguments_["message"]),
                requestedSchema: {
                  type: "object",
                  properties: {
                    username: { type: "string" },
                    email: { type: "string" },
                  },
                  required: ["username", "email"],
                },
              })
              .pipe(
                Effect.mapError(
                  (error) =>
                    new McpSchema.InternalError({ message: error.operation }),
                ),
              );
            return new McpSchema.CallToolResult({
              content: [
                {
                  type: "text",
                  text:
                    result.action === "accept"
                      ? "Elicitation accepted"
                      : "Elicitation not accepted",
                },
              ],
            });
          }),
        ),
    });
  }),
).pipe(Layer.provideMerge(server("tools-call-elicitation")));
const program = scenario.pipe(
  HttpRouter.serve,
  HttpServer.withLogAddress,
  Layer.provide(BunHttpServer.layerConfig(McpServerConfig)),
  Layer.launch,
  Effect.satisfiesServicesType<never>(),
);
BunRuntime.runMain(program);
