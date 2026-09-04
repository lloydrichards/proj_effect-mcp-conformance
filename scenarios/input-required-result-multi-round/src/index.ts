import { BunHttpServer, BunRuntime } from "@effect/platform-bun";
import { Context, Effect, Layer } from "effect";
import { McpSchema, McpServer } from "effect/unstable/ai";
import { HttpRouter, HttpServer } from "effect/unstable/http";
import { McpServerConfig, server } from "@repo/mcp-fixture";

const MultiRoundTool = new McpSchema.Tool({
  name: "test_input_required_result_multi_round",
  description: "Requests MRTR input in two rounds.",
  inputSchema: { type: "object" },
});

const handleMultiRound = () =>
  Effect.gen(function* () {
    const context = yield* McpSchema.McpRequestContext;
    if (context.requestState === undefined)
      return new McpSchema.InputRequired({
        inputRequests: {
          step1: {
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
        requestState: "round-1",
      });
    if (
      context.requestState === "round-1" &&
      context.inputResponses?.["step1"] !== undefined
    )
      return new McpSchema.InputRequired({
        inputRequests: {
          step2: {
            method: "elicitation/create",
            params: {
              message: "What is your favorite color?",
              requestedSchema: {
                type: "object",
                properties: { color: { type: "string" } },
                required: ["color"],
              },
            },
          },
        },
        requestState: "round-2",
      });
    return context.requestState === "round-2" &&
      context.inputResponses?.["step2"] !== undefined
      ? new McpSchema.CallToolResult({
          content: [{ type: "text", text: "Multi-round input completed." }],
        })
      : yield* new McpSchema.InvalidParams({
          message: "Invalid multi-round requestState or input response",
        });
  });

const MultiRoundRegistration = Layer.effectDiscard(
  McpServer.McpServer.use((mcp) =>
    mcp.addTool({
      tool: MultiRoundTool,
      annotations: Context.empty(),
      handle: handleMultiRound,
    }),
  ),
);

const ScenarioLive = MultiRoundRegistration.pipe(
  Layer.provideMerge(server("input-required-result-multi-round")),
);

const MainLive = ScenarioLive.pipe(
  HttpRouter.serve,
  HttpServer.withLogAddress,
  Layer.provide(BunHttpServer.layerConfig(McpServerConfig)),
);

const main = Layer.launch(MainLive).pipe(Effect.satisfiesServicesType<never>());

BunRuntime.runMain(main);
