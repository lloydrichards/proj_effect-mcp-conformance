import { BunHttpServer, BunRuntime } from "@effect/platform-bun";
import { Context, Effect, Layer, Predicate } from "effect";
import { McpSchema, McpServer } from "effect/unstable/ai";
import { HttpRouter, HttpServer } from "effect/unstable/http";
import { McpServerConfig, server } from "@repo/mcp-fixture";

const ValidateInputTool = new McpSchema.Tool({
  name: "test_input_required_result_elicitation",
  description: "Validates the elicitation response before completion.",
  inputSchema: { type: "object" },
});

const handleValidateInput = () =>
  McpSchema.McpRequestContext.useSync((context) => {
    const response = context.inputResponses?.["user_name"];
    const name =
      Predicate.isReadonlyObject(response) &&
      response["action"] === "accept" &&
      Predicate.isReadonlyObject(response["content"]) &&
      typeof response["content"]["name"] === "string"
        ? response["content"]["name"]
        : undefined;
    return name === undefined
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
          content: [{ type: "text", text: `Hello, ${name}!` }],
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

const ScenarioLive = ValidateInputRegistration.pipe(
  Layer.provideMerge(server("input-required-result-validate-input")),
);

const MainLive = ScenarioLive.pipe(
  HttpRouter.serve,
  HttpServer.withLogAddress,
  Layer.provide(BunHttpServer.layerConfig(McpServerConfig)),
);

const main = Layer.launch(MainLive).pipe(Effect.satisfiesServicesType<never>());

BunRuntime.runMain(main);
