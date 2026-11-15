import { BunHttpServer, BunRuntime } from "@effect/platform-bun";
import { Context, Effect, Layer, Schema } from "effect";
import { McpSchema, McpServer } from "effect/ai";
import { HttpRouter, HttpServer } from "effect/http";
import { McpProtocolConfig, McpServerConfig } from "@repo/mcp-fixture";

const ValidateInputTool = new McpSchema.Tool({
  name: "test_input_required_result_elicitation",
  description: "Validates the elicitation response before completion.",
  inputSchema: { type: "object" },
});

const AcceptedName = Schema.Struct({
  action: Schema.Literal("accept"),
  content: Schema.Struct({ name: Schema.String }),
});

const handleValidateInput = () =>
  McpSchema.McpRequestContext.useSync((context) => {
    const response = context.inputResponses?.["user_name"];
    return !Schema.is(AcceptedName)(response)
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
      : new McpSchema.CallToolResult({
          content: [{ type: "text", text: `Hello, ${response.content.name}!` }],
        });
  });

const ValidateInputRegistration = Layer.effectDiscard(
  McpServer.McpServer.use((mcp) =>
    mcp.addTool({
      tool: ValidateInputTool,
      annotations: Context.empty(),
      handle: handleValidateInput,
    }),
  ),
);

const McpHttpLive = Effect.map(
  McpProtocolConfig,
  ({ protocols, allowedOrigins }) =>
    McpServer.layerHttp({
      name: "Effect MCP fixture: input-required-result-validate-input",
      version: "0.1.0",
      path: "/mcp",
      protocols,
      allowedOrigins,
    }),
).pipe(Layer.unwrap);

const ScenarioLive = ValidateInputRegistration.pipe(
  Layer.provideMerge(McpHttpLive),
);

const MainLive = ScenarioLive.pipe(
  HttpRouter.serve,
  HttpServer.withLogAddress,
  Layer.provide(BunHttpServer.layerConfig(McpServerConfig)),
);

const main = Layer.launch(MainLive).pipe(Effect.satisfiesServicesType<never>());

BunRuntime.runMain(main);
