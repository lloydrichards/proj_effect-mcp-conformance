import { BunHttpServer, BunRuntime } from "@effect/platform-bun";
import { Context, Effect, Layer } from "effect";
import { McpSchema, McpServer } from "effect/unstable/ai";
import { HttpRouter, HttpServer } from "effect/unstable/http";
import { McpServerConfig, server } from "@repo/mcp-fixture";

const CapabilityCheckTool = new McpSchema.Tool({
  name: "test_input_required_result_capabilities",
  description: "Uses only advertised client input capabilities.",
  inputSchema: { type: "object" },
});

const handleCapabilityCheck = () =>
  McpSchema.McpRequestContext.useSync((context) => {
    const inputRequests: Record<string, McpSchema.McpInputRequest> = {};
    if (context.clientCapabilities.sampling !== undefined)
      inputRequests["sampling"] = {
        method: "sampling/createMessage",
        params: {
          messages: [
            {
              role: "user",
              content: {
                type: "text",
                text: "What is the capital of France?",
              },
            },
          ],
          maxTokens: 100,
        },
      };
    if (context.clientCapabilities.elicitation !== undefined)
      inputRequests["elicitation"] = {
        method: "elicitation/create",
        params: {
          message: "What is your name?",
          requestedSchema: {
            type: "object",
            properties: { name: { type: "string" } },
            required: ["name"],
          },
        },
      };
    return Object.keys(inputRequests).length > 0
      ? new McpSchema.InputRequired({ inputRequests })
      : new McpSchema.CallToolResult({
          content: [
            {
              type: "text",
              text: "No supported client input capability was declared.",
            },
          ],
        });
  });

const CapabilityCheckRegistration = Layer.effectDiscard(
  McpServer.McpServer.use((mcp) =>
    mcp.addTool({
      tool: CapabilityCheckTool,
      annotations: Context.empty(),
      handle: handleCapabilityCheck,
    }),
  ),
);

const ScenarioLive = CapabilityCheckRegistration.pipe(
  Layer.provideMerge(server("input-required-result-capability-check")),
);

const MainLive = ScenarioLive.pipe(
  HttpRouter.serve,
  HttpServer.withLogAddress,
  Layer.provide(BunHttpServer.layerConfig(McpServerConfig)),
);

const main = Layer.launch(MainLive).pipe(Effect.satisfiesServicesType<never>());

BunRuntime.runMain(main);
