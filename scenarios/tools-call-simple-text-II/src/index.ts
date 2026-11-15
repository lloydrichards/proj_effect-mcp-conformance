import { Context, Effect, Layer } from "effect";
import { McpSchema, McpServer } from "effect/ai";
import { runHttpScenario, server } from "@repo/mcp-fixture";

const SimpleTextTool = new McpSchema.Tool({
  name: "test_simple_text",
  description: "Returns test text.",
  inputSchema: { type: "object" },
});

const simpleTextHandler = () =>
  Effect.succeed(
    new McpSchema.CallToolResult({
      content: [
        {
          type: "text",
          text: "This is a simple text response for testing.",
        },
      ],
    }),
  );

const SimpleTextRegistration = Layer.effectDiscard(
  McpServer.McpServer.use((mcp) =>
    mcp.addTool({
      tool: SimpleTextTool,
      annotations: Context.empty(),
      handle: simpleTextHandler,
    }),
  ),
);

// layerHttp builds these registrations when it acquires the endpoint.
const ScenarioLive = server(
  "tools-call-simple-text-II",
  SimpleTextRegistration,
);

runHttpScenario(ScenarioLive);
