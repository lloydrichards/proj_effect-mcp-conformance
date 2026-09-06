import { BunHttpServer, BunRuntime } from "@effect/platform-bun";
import { Context, Effect, Layer } from "effect";
import { McpSchema, McpServer } from "effect/unstable/ai";
import { HttpRouter, HttpServer } from "effect/unstable/http";
import { McpServerConfig, server } from "@repo/mcp-fixture";

const ProgressTool = new McpSchema.Tool({
  name: "test_tool_with_progress",
  description: "Returns after progress-capable work.",
  inputSchema: { type: "object" },
});
const LoggingTool = new McpSchema.Tool({
  name: "test_tool_with_logging",
  description: "Emits log messages while it runs.",
  inputSchema: { type: "object" },
});
const result = (text: string) =>
  new McpSchema.CallToolResult({ content: [{ type: "text", text }] });
const InteractiveRegistration = Layer.effectDiscard(
  McpServer.McpServer.use((mcp) =>
    Effect.gen(function* () {
      yield* mcp.addTool({
        tool: ProgressTool,
        annotations: Context.empty(),
        handle: () =>
          Effect.gen(function* () {
            const context = yield* McpSchema.McpRequestContext;
            const token = context.requestMetadata?.progressToken;
            if (typeof token === "string" || typeof token === "number")
              for (const progress of [0, 50, 100]) {
                yield* mcp.notifications["notifications/progress"]({
                  progressToken: token,
                  progress,
                  total: 100,
                });
                if (progress < 100) yield* Effect.sleep("50 millis");
              }
            yield* Effect.sleep("10 millis");
            return result("Progress completed");
          }),
      });
      yield* mcp.addTool({
        tool: LoggingTool,
        annotations: Context.empty(),
        handle: () =>
          Effect.gen(function* () {
            for (const data of [
              "Tool execution started",
              "Tool processing data",
              "Tool execution completed",
            ]) {
              yield* mcp.notifications["notifications/message"]({
                level: "info",
                data,
              });
              yield* Effect.sleep("50 millis");
            }
            yield* Effect.sleep("10 millis");
            return result("Tool execution completed");
          }),
      });
    }),
  ),
);
const ScenarioLive = InteractiveRegistration.pipe(
  Layer.provideMerge(server("stateful-interactive-http")),
);
const MainLive = ScenarioLive.pipe(
  HttpRouter.serve,
  HttpServer.withLogAddress,
  Layer.provide(BunHttpServer.layerConfig(McpServerConfig)),
);
const main = Layer.launch(MainLive).pipe(Effect.satisfiesServicesType<never>());
BunRuntime.runMain(main);
