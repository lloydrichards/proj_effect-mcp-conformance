import { BunHttpServer, BunRuntime } from "@effect/platform-bun";
import { Context, Effect, Layer, Schema } from "effect";
import { McpSchema, McpServer } from "effect/ai";
import { HttpRouter, HttpServer } from "effect/http";
import { McpProtocolConfig, McpServerConfig } from "@repo/mcp-fixture";

const ElicitationTool = new McpSchema.Tool({
  name: "test_input_required_result_elicitation",
  description: "Validates the elicitation response before completion.",
  inputSchema: { type: "object" },
});
const CapabilityTool = new McpSchema.Tool({
  name: "test_input_required_result_capabilities",
  description: "Uses only advertised client input capabilities.",
  inputSchema: { type: "object" },
});
const nameRequest = {
  method: "elicitation/create" as const,
  params: {
    message: "What is your name?",
    requestedSchema: {
      type: "object",
      properties: { name: { type: "string" } },
      required: ["name"],
    },
  },
};
const AcceptedName = Schema.Struct({
  action: Schema.Literal("accept"),
  content: Schema.Struct({ name: Schema.String }),
});

const adversarialHandler = () =>
  McpSchema.McpRequestContext.useSync((context) => {
    const response = context.inputResponses?.["user_name"];
    return !Schema.is(AcceptedName)(response)
      ? new McpSchema.InputRequired({
          inputRequests: { user_name: nameRequest },
        })
      : new McpSchema.CallToolResult({
          content: [{ type: "text", text: `Hello, ${response.content.name}!` }],
        });
  });
const InputValidationTools = Layer.effectDiscard(
  McpServer.McpServer.use((mcp) =>
    Effect.gen(function* () {
      yield* mcp.addTool({
        tool: ElicitationTool,
        annotations: Context.empty(),
        handle: adversarialHandler,
      });
      yield* mcp.addTool({
        tool: CapabilityTool,
        annotations: Context.empty(),
        handle: () =>
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
              inputRequests["elicitation"] = nameRequest;
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
          }),
      });
    }),
  ),
);

const McpHttpLive = Effect.map(
  McpProtocolConfig,
  ({ protocols, allowedOrigins }) =>
    McpServer.layerHttp({
      name: "Effect MCP fixture: mrtr-adversarial-http",
      version: "0.1.0",
      path: "/mcp",
      protocols,
      allowedOrigins,
    }),
).pipe(Layer.unwrap);

const ScenarioLive = InputValidationTools.pipe(Layer.provideMerge(McpHttpLive));

const MainLive = ScenarioLive.pipe(
  HttpRouter.serve,
  HttpServer.withLogAddress,
  Layer.provide(BunHttpServer.layerConfig(McpServerConfig)),
);

const main = Layer.launch(MainLive).pipe(Effect.satisfiesServicesType<never>());

BunRuntime.runMain(main);
