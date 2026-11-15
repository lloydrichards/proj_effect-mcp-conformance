import { BunHttpServer, BunRuntime } from "@effect/platform-bun";
import { Context, Effect, Layer, Predicate } from "effect";
import { McpSchema, McpServer } from "effect/ai";
import { HttpRouter, HttpServer } from "effect/http";
import { McpProtocolConfig, McpServerConfig } from "@repo/mcp-fixture";

const MissingInputResponseTool = new McpSchema.Tool({
  name: "test_input_required_result_elicitation",
  description: "Requires the requested elicitation response.",
  inputSchema: { type: "object" },
});

const handleMissingInputResponse = () =>
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

const MissingInputResponseRegistration = Layer.effectDiscard(
  McpServer.McpServer.use((mcp) =>
    mcp.addTool({
      tool: MissingInputResponseTool,
      annotations: Context.empty(),
      handle: handleMissingInputResponse,
    }),
  ),
);

const McpHttpLive = Effect.map(
  McpProtocolConfig,
  ({ protocols, allowedOrigins }) =>
    McpServer.layerHttp({
      name: "Effect MCP fixture: input-required-result-missing-input-response",
      version: "0.1.0",
      path: "/mcp",
      protocols,
      allowedOrigins,
    }),
).pipe(Layer.unwrap);

const ScenarioLive = MissingInputResponseRegistration.pipe(
  Layer.provideMerge(McpHttpLive),
);

const MainLive = ScenarioLive.pipe(
  HttpRouter.serve,
  HttpServer.withLogAddress,
  Layer.provide(BunHttpServer.layerConfig(McpServerConfig)),
);

const main = Layer.launch(MainLive).pipe(Effect.satisfiesServicesType<never>());

BunRuntime.runMain(main);
