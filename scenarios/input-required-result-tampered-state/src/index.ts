import { BunHttpServer, BunRuntime } from "@effect/platform-bun";
import { Context, Effect, Layer } from "effect";
import { McpSchema, McpServer } from "effect/unstable/ai";
import { HttpRouter, HttpServer } from "effect/unstable/http";
import { McpServerConfig, server } from "@repo/mcp-fixture";

const TamperedStateTool = new McpSchema.Tool({
  name: "test_input_required_result_tampered_state",
  description: "Rejects a tampered MRTR request state.",
  inputSchema: { type: "object" },
});

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
        requestState: "signed-state:7f6c86f6",
      });
    return context.requestState === "signed-state:7f6c86f6" &&
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

const ScenarioLive = TamperedStateRegistration.pipe(
  Layer.provideMerge(server("input-required-result-tampered-state")),
);

const MainLive = ScenarioLive.pipe(
  HttpRouter.serve,
  HttpServer.withLogAddress,
  Layer.provide(BunHttpServer.layerConfig(McpServerConfig)),
);

const main = Layer.launch(MainLive).pipe(Effect.satisfiesServicesType<never>());

BunRuntime.runMain(main);
