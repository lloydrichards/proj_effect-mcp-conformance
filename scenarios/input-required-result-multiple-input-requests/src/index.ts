import { BunHttpServer, BunRuntime } from "@effect/platform-bun";
import { Context, Effect, Layer } from "effect";
import { McpSchema, McpServer } from "effect/ai";
import { HttpRouter, HttpServer } from "effect/http";
import { McpProtocolConfig, McpServerConfig } from "@repo/mcp-fixture";

const MultipleInputRequestsTool = new McpSchema.Tool({
  name: "test_input_required_result_multiple_inputs",
  description: "Requests several MRTR inputs.",
  inputSchema: { type: "object" },
});

const handleMultipleInputRequests = () =>
  McpSchema.McpRequestContext.useSync((context) => {
    const inputRequests = {
      user_name: {
        method: "elicitation/create" as const,
        params: {
          message: "What is your name?",
          requestedSchema: {
            type: "object",
            properties: { name: { type: "string" } },
            required: ["name"],
          },
        },
      },
      greeting: {
        method: "sampling/createMessage" as const,
        params: {
          messages: [
            {
              role: "user" as const,
              content: {
                type: "text" as const,
                text: "What is the capital of France?",
              },
            },
          ],
          maxTokens: 100,
        },
      },
      client_roots: { method: "roots/list" as const, params: {} },
    };
    const responses = context.inputResponses;
    return context.requestState === "multiple-inputs-v1" &&
      ["user_name", "greeting", "client_roots"].every(
        (key) => responses?.[key] !== undefined,
      )
      ? new McpSchema.CallToolResult({
          content: [
            {
              type: "text",
              text: "All requested client input was received.",
            },
          ],
        })
      : new McpSchema.InputRequired({
          inputRequests,
          requestState: "multiple-inputs-v1",
        });
  });

const MultipleInputRequestsRegistration = Layer.effectDiscard(
  McpServer.McpServer.use((mcp) =>
    mcp.addTool({
      tool: MultipleInputRequestsTool,
      annotations: Context.empty(),
      handle: handleMultipleInputRequests,
    }),
  ),
);

const McpHttpLive = Effect.map(
  McpProtocolConfig,
  ({ protocols, allowedOrigins }) =>
    McpServer.layerHttp({
      name: "Effect MCP fixture: input-required-result-multiple-input-requests",
      version: "0.1.0",
      path: "/mcp",
      protocols,
      allowedOrigins,
    }),
).pipe(Layer.unwrap);

const ScenarioLive = MultipleInputRequestsRegistration.pipe(
  Layer.provideMerge(McpHttpLive),
);

const MainLive = ScenarioLive.pipe(
  HttpRouter.serve,
  HttpServer.withLogAddress,
  Layer.provide(BunHttpServer.layerConfig(McpServerConfig)),
);

const main = Layer.launch(MainLive).pipe(Effect.satisfiesServicesType<never>());

BunRuntime.runMain(main);
