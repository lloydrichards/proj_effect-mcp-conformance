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
        name: "test_tool_with_logging",
        description: "Emits log messages while it runs.",
        inputSchema: { type: "object" },
      }),
      annotations: Context.empty(),
      handle: () =>
        Effect.gen(function* () {
          yield* mcp.notifications["notifications/message"]({
            level: "info",
            data: "Tool execution started",
          });
          yield* Effect.sleep("50 millis");
          yield* mcp.notifications["notifications/message"]({
            level: "info",
            data: "Tool processing data",
          });
          yield* Effect.sleep("50 millis");
          yield* mcp.notifications["notifications/message"]({
            level: "info",
            data: "Tool execution completed",
          });
          return new McpSchema.CallToolResult({
            content: [{ type: "text", text: "Tool execution completed" }],
          });
        }),
    });
  }),
).pipe(Layer.provideMerge(server("tools-call-with-logging")));
const program = scenario.pipe(
  HttpRouter.serve,
  HttpServer.withLogAddress,
  Layer.provide(BunHttpServer.layerConfig(McpServerConfig)),
  Layer.launch,
  Effect.satisfiesServicesType<never>(),
);
BunRuntime.runMain(program);
