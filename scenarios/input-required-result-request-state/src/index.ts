import { BunHttpServer, BunRuntime } from "@effect/platform-bun";
import { Context, Effect, Layer } from "effect";
import { McpSchema, McpServer } from "effect/unstable/ai";
import { HttpRouter, HttpServer } from "effect/unstable/http";
import { McpServerConfig, server } from "@repo/mcp-fixture";

const RequestStateTool = new McpSchema.Tool({
  name: "test_input_required_result_request_state",
  description: "Round-trips MRTR request state.",
  inputSchema: { type: "object" },
});

const handleRequestState = () =>
  Effect.gen(function* () {
    const context = yield* McpSchema.McpRequestContext;
    if (context.requestState === undefined)
      return new McpSchema.InputRequired({
        inputRequests: {
          confirm: {
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
        requestState: "request-state-v1",
      });
    return context.requestState === "request-state-v1" &&
      context.inputResponses?.["confirm"] !== undefined
      ? new McpSchema.CallToolResult({
          content: [{ type: "text", text: "state-ok" }],
        })
      : yield* new McpSchema.InvalidParams({
          message: "Invalid requestState or missing confirm response",
        });
  });

const RequestStateRegistration = Layer.effectDiscard(
  McpServer.McpServer.use((mcp) =>
    mcp.addTool({
      tool: RequestStateTool,
      annotations: Context.empty(),
      handle: handleRequestState,
    }),
  ),
);

const ScenarioLive = RequestStateRegistration.pipe(
  Layer.provideMerge(server("input-required-result-request-state")),
);

const MainLive = ScenarioLive.pipe(
  HttpRouter.serve,
  HttpServer.withLogAddress,
  Layer.provide(BunHttpServer.layerConfig(McpServerConfig)),
);

const main = Layer.launch(MainLive).pipe(Effect.satisfiesServicesType<never>());

BunRuntime.runMain(main);
