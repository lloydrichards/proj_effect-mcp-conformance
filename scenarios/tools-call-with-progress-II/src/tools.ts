import { Context, Effect, Layer } from "effect";
import { McpSchema, McpServer } from "effect/ai";

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
export const InteractiveTools = Layer.effectDiscard(
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
