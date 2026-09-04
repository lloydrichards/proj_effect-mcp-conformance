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

const handleElicitation = () =>
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
      : new McpSchema.CallToolResult({
          content: [{ type: "text", text: "Elicitation completed." }],
        }),
  );

const ElicitationRegistration = Layer.effectDiscard(
  McpServer.McpServer.use((mcp) =>
    mcp.addTool({
      tool: ElicitationTool,
      annotations: Context.empty(),
      handle: handleElicitation,
    }),
  ),
);

const ScenarioLive = ElicitationRegistration.pipe(
  Layer.provideMerge(server("input-required-result-basic-elicitation")),
);

const MainLive = ScenarioLive.pipe(
  HttpRouter.serve,
  HttpServer.withLogAddress,
  Layer.provide(BunHttpServer.layerConfig(McpServerConfig)),
);

const main = Layer.launch(MainLive).pipe(Effect.satisfiesServicesType<never>());

BunRuntime.runMain(main);
