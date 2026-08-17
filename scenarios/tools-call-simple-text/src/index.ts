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
        name: "test_simple_text",
        description: "Returns test text.",
        inputSchema: { type: "object" },
      }),
      annotations: Context.empty(),
      handle: () =>
        Effect.succeed(
          new McpSchema.CallToolResult({
            content: [
              {
                type: "text",
                text: "This is a simple text response for testing.",
              },
            ],
          }),
        ),
    });
  }),
).pipe(Layer.provideMerge(server("tools-call-simple-text")));

const program = scenario.pipe(
  HttpRouter.serve,
  HttpServer.withLogAddress,
  Layer.provide(BunHttpServer.layerConfig(McpServerConfig)),
  Layer.launch,
  Effect.satisfiesServicesType<never>(),
);
BunRuntime.runMain(program);
