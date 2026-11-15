import { runHttpScenario, server } from "@repo/mcp-fixture";
import { Context, Effect, Layer } from "effect";
import { McpSchema, McpServer } from "effect/ai";

const ToolDiscoveryTool = new McpSchema.Tool({
  name: "test_tool",
  description: "A minimal tool used to verify MCP tool discovery.",
  inputSchema: {
    type: "object",
    properties: { input: { type: "string" } },
  },
});

const ToolDiscoveryRegistration = Layer.effectDiscard(
  McpServer.McpServer.use((registry) =>
    registry.addTool({
      tool: ToolDiscoveryTool,
      annotations: Context.empty(),
      handle: () =>
        Effect.succeed(
          new McpSchema.CallToolResult({
            content: [{ type: "text", text: "tool discovery is working" }],
          }),
        ),
    }),
  ),
);

const ScenarioLive = ToolDiscoveryRegistration.pipe(
  Layer.provideMerge(server("tools-list-IV")),
);

runHttpScenario(ScenarioLive);
