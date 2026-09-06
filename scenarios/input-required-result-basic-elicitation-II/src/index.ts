import { BunHttpServer, BunRuntime } from "@effect/platform-bun";
import { Context, Effect, Layer } from "effect";
import { McpSchema, McpServer } from "effect/unstable/ai";
import { HttpRouter, HttpServer } from "effect/unstable/http";
import { McpServerConfig, server } from "@repo/mcp-fixture";

const ElicitationTool = new McpSchema.Tool({
  name: "test_input_required_result_elicitation",
  description: "Requests a name through MRTR.",
  inputSchema: { type: "object" },
});
const SamplingTool = new McpSchema.Tool({
  name: "test_input_required_result_sampling",
  description: "Requests sampling through MRTR.",
  inputSchema: { type: "object" },
});
const ListRootsTool = new McpSchema.Tool({
  name: "test_input_required_result_list_roots",
  description: "Requests client roots through MRTR.",
  inputSchema: { type: "object" },
});
const completed = (text: string) =>
  new McpSchema.CallToolResult({ content: [{ type: "text", text }] });

const HappyPathRegistration = Layer.effectDiscard(
  McpServer.McpServer.use((mcp) =>
    Effect.gen(function* () {
      yield* mcp.addTool({
        tool: ElicitationTool,
        annotations: Context.empty(),
        handle: () =>
          McpSchema.McpRequestContext.useSync((context) =>
            context.inputResponses?.["user_name"] === undefined
              ? new McpSchema.InputRequired({
                  inputRequests: {
                    user_name: {
                      method: "elicitation/create",
                      params: {
                        message: "What is your name?",
                        requestedSchema: {
                          type: "object",
                          properties: { name: { type: "string" } },
                          required: ["name"],
                        },
                      },
                    },
                  },
                })
              : completed("Elicitation completed."),
          ),
      });
      yield* mcp.addTool({
        tool: SamplingTool,
        annotations: Context.empty(),
        handle: () =>
          McpSchema.McpRequestContext.useSync((context) =>
            context.inputResponses?.["capital_question"] === undefined
              ? new McpSchema.InputRequired({
                  inputRequests: {
                    capital_question: {
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
                    },
                  },
                })
              : completed("The capital is Paris."),
          ),
      });
      yield* mcp.addTool({
        tool: ListRootsTool,
        annotations: Context.empty(),
        handle: () =>
          McpSchema.McpRequestContext.useSync((context) =>
            context.inputResponses?.["client_roots"] === undefined
              ? new McpSchema.InputRequired({
                  inputRequests: {
                    client_roots: { method: "roots/list", params: {} },
                  },
                })
              : completed("Client roots received."),
          ),
      });
    }),
  ),
);
const ScenarioLive = HappyPathRegistration.pipe(
  Layer.provideMerge(server("mrtr-happy-path-http")),
);
const MainLive = ScenarioLive.pipe(
  HttpRouter.serve,
  HttpServer.withLogAddress,
  Layer.provide(BunHttpServer.layerConfig(McpServerConfig)),
);
const main = Layer.launch(MainLive).pipe(Effect.satisfiesServicesType<never>());
BunRuntime.runMain(main);
