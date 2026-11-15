import { Context, Effect, Layer, Schema } from "effect";
import { McpSchema, McpServer, Tool, Toolkit } from "effect/ai";
import { runHttpScenario, server } from "@repo/mcp-fixture";

const textResult = (text: string) =>
  new McpSchema.CallToolResult({ content: [{ type: "text", text }] });
const contracts = {
  missingCapability: new McpSchema.Tool({
    name: "test_missing_capability",
    description: "Requires the client sampling capability.",
    inputSchema: { type: "object" },
  }),
  streamingElicitation: new McpSchema.Tool({
    name: "test_streaming_elicitation",
    description: "Returns a result over the request response stream.",
    inputSchema: { type: "object" },
  }),
  logging: new McpSchema.Tool({
    name: "test_logging_tool",
    description: "Returns without sending a logging notification.",
    inputSchema: { type: "object" },
  }),
  trigger: new McpSchema.Tool({
    name: "test_trigger_tool_change",
    description: "Adds a tool so subscribers receive tools/list_changed.",
    inputSchema: { type: "object" },
  }),
};

const DynamicTestTool = Tool.make("dynamic_test_tool", {
  description: "A tool added during the list-change probe.",
  parameters: Tool.EmptyParams,
  success: Schema.String,
});

const DynamicToolkit = Toolkit.make(DynamicTestTool);
const DynamicHandlers = DynamicToolkit.toLayer({
  dynamic_test_tool: () => Effect.succeed("Dynamic tool called"),
});

const DynamicRegistryRegistration = Layer.effectDiscard(
  McpServer.McpServer.use((mcp) =>
    Effect.gen(function* () {
      yield* mcp.addTool({
        tool: contracts.missingCapability,
        annotations: Context.empty(),
        handle: () =>
          Effect.succeed(
            new McpSchema.InputRequired({
              inputRequests: {
                sampling: {
                  method: "sampling/createMessage",
                  params: {
                    messages: [
                      {
                        role: "user",
                        content: { type: "text", text: "Capability probe" },
                      },
                    ],
                    maxTokens: 1,
                  },
                },
              },
            }),
          ),
      });
      yield* mcp.addTool({
        tool: contracts.streamingElicitation,
        annotations: Context.empty(),
        handle: () =>
          Effect.succeed(textResult("Streaming response completed")),
      });
      yield* mcp.addTool({
        tool: contracts.logging,
        annotations: Context.empty(),
        handle: () => Effect.succeed(textResult("No log was emitted")),
      });
      yield* mcp.addTool({
        tool: contracts.trigger,
        annotations: Context.empty(),
        handle: () =>
          McpServer.registerToolkit(DynamicToolkit).pipe(
            Effect.provide(DynamicHandlers),
            Effect.provideService(McpServer.McpServer, mcp),
            Effect.as(textResult("Tool list changed")),
          ),
      });
    }),
  ),
);

const ScenarioLive = DynamicRegistryRegistration.pipe(
  Layer.provideMerge(server("server-stateless-II")),
);
runHttpScenario(ScenarioLive);
