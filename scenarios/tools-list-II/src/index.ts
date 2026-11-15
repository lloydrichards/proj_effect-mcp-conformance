import { runHttpScenario, server } from "@repo/mcp-fixture";
import { Effect, Layer, Schema } from "effect";
import { McpServer, Tool, Toolkit } from "effect/ai";

const ToolDiscoveryTool = Tool.dynamic("test_tool", {
  description: "A minimal tool used to verify MCP tool discovery.",
  parameters: {
    type: "object",
    properties: { input: { type: "string" } },
  },
  success: Schema.String,
});

const ToolDiscoveryToolkit = Toolkit.make(ToolDiscoveryTool);

const ToolDiscoveryHandlers = ToolDiscoveryToolkit.toLayer({
  test_tool: () => Effect.succeed("tool discovery is working"),
});

const ToolDiscoveryFeatures = McpServer.toolkit(ToolDiscoveryToolkit).pipe(
  Layer.provide(ToolDiscoveryHandlers),
);

const ScenarioLive = ToolDiscoveryFeatures.pipe(
  Layer.provideMerge(server("tools-list-II")),
);

runHttpScenario(ScenarioLive);
