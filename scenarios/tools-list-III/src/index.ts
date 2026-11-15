import { runHttpScenario, server } from "@repo/mcp-fixture";
import { Effect, Layer, Schema } from "effect";
import { McpServer, Tool, Toolkit } from "effect/ai";

const ToolDiscoveryTool = Tool.make("test_tool", {
  description: "A minimal tool used to verify MCP tool discovery.",
  parameters: Schema.Struct({ input: Schema.optionalKey(Schema.String) }),
  success: Schema.String,
});

const ToolDiscoveryToolkit = Toolkit.make(ToolDiscoveryTool);

const ToolDiscoveryHandlers = ToolDiscoveryToolkit.toLayer({
  test_tool: () => Effect.succeed("tool discovery is working"),
});

const ToolDiscoveryRegistration = Layer.effectDiscard(
  McpServer.registerToolkit(ToolDiscoveryToolkit),
).pipe(Layer.provide(ToolDiscoveryHandlers));

const ScenarioLive = ToolDiscoveryRegistration.pipe(
  Layer.provideMerge(server("tools-list-III")),
);

runHttpScenario(ScenarioLive);
