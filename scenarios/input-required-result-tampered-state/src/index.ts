import { BunHttpServer, BunRuntime } from "@effect/platform-bun";
import { Context, Effect, Layer } from "effect";
import { McpSchema, McpServer } from "effect/ai";
import { HttpRouter, HttpServer } from "effect/http";
import { McpProtocolConfig, McpServerConfig } from "@repo/mcp-fixture";
import { makeRequestStateSigner } from "@repo/mcp-fixture/request-state";

const TamperedStateTool = new McpSchema.Tool({
  name: "test_input_required_result_tampered_state",
  description: "Rejects a tampered MRTR request state.",
  inputSchema: { type: "object" },
});

const confirmationState = makeRequestStateSigner(
  "test_input_required_result_tampered_state/confirm",
);

const tamperedStateHandler = () =>
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
        requestState: confirmationState.issue(),
      });
    return confirmationState.verify(context.requestState) &&
      context.inputResponses?.["confirm"] !== undefined
      ? new McpSchema.CallToolResult({
          content: [{ type: "text", text: "Validated state accepted." }],
        })
      : yield* new McpSchema.InvalidParams({
          message: "requestState integrity check failed",
        });
  });

const TamperedStateRegistration = Layer.effectDiscard(
  McpServer.McpServer.use((mcp) =>
    mcp.addTool({
      tool: TamperedStateTool,
      annotations: Context.empty(),
      handle: tamperedStateHandler,
    }),
  ),
);

const McpHttpLive = Effect.map(
  McpProtocolConfig,
  ({ protocols, allowedOrigins }) =>
    McpServer.layerHttp({
      name: "Effect MCP fixture: input-required-result-tampered-state",
      version: "0.1.0",
      path: "/mcp",
      protocols,
      allowedOrigins,
    }),
).pipe(Layer.unwrap);

const ScenarioLive = TamperedStateRegistration.pipe(
  Layer.provideMerge(McpHttpLive),
);

const MainLive = ScenarioLive.pipe(
  HttpRouter.serve,
  HttpServer.withLogAddress,
  Layer.provide(BunHttpServer.layerConfig(McpServerConfig)),
);

const main = Layer.launch(MainLive).pipe(Effect.satisfiesServicesType<never>());

BunRuntime.runMain(main);
