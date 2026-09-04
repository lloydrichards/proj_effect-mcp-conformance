import { BunHttpServer, BunRuntime } from "@effect/platform-bun";
import { Context, Effect, Layer } from "effect";
import { McpSchema, McpServer } from "effect/unstable/ai";
import { HttpRouter, HttpServer } from "effect/unstable/http";
import { McpServerConfig, server } from "@repo/mcp-fixture";

const LoggingTool = new McpSchema.Tool({
  name: "test_tool_with_logging",
  description: "Emits log messages while it runs.",
  inputSchema: { type: "object" },
});

const loggingToolHandler = (mcp: McpServer.McpServer["Service"]) =>
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
    yield* Effect.sleep("10 millis");
    return new McpSchema.CallToolResult({
      content: [{ type: "text", text: "Tool execution completed" }],
    });
  });

const LoggingToolRegistration = Layer.effectDiscard(
  Effect.gen(function* () {
    const mcp = yield* McpServer.McpServer;
    yield* mcp.addTool({
      tool: LoggingTool,
      annotations: Context.empty(),
      handle: () => loggingToolHandler(mcp),
    });
  }),
);

const ScenarioLive = LoggingToolRegistration.pipe(
  Layer.provideMerge(server("tools-call-with-logging")),
);

const MainLive = ScenarioLive.pipe(
  HttpRouter.serve,
  HttpServer.withLogAddress,
  Layer.provide(BunHttpServer.layerConfig(McpServerConfig)),
);

const main = Layer.launch(MainLive).pipe(Effect.satisfiesServicesType<never>());

BunRuntime.runMain(main);
