import { BunHttpServer, BunRuntime } from "@effect/platform-bun";
import { Context, Effect, Layer } from "effect";
import { McpSchema, McpServer } from "effect/unstable/ai";
import { HttpRouter, HttpServer } from "effect/unstable/http";
import { McpServerConfig, server } from "@repo/mcp-fixture";

const tools = {
  state: new McpSchema.Tool({
    name: "test_input_required_result_request_state",
    description: "Round-trips MRTR request state.",
    inputSchema: { type: "object" },
  }),
  tampered: new McpSchema.Tool({
    name: "test_input_required_result_tampered_state",
    description: "Rejects a tampered MRTR request state.",
    inputSchema: { type: "object" },
  }),
  multiple: new McpSchema.Tool({
    name: "test_input_required_result_multiple_inputs",
    description: "Requests several MRTR inputs.",
    inputSchema: { type: "object" },
  }),
  rounds: new McpSchema.Tool({
    name: "test_input_required_result_multi_round",
    description: "Requests MRTR input in two rounds.",
    inputSchema: { type: "object" },
  }),
};
const elicit = (message: string, property: string) => ({
  method: "elicitation/create" as const,
  params: {
    message,
    requestedSchema: {
      type: "object",
      properties: { [property]: { type: "string" } },
      required: [property],
    },
  },
});
const result = (text: string) =>
  new McpSchema.CallToolResult({ content: [{ type: "text", text }] });
const invalid = (message: string) => new McpSchema.InvalidParams({ message });
const requestStateHandler = () =>
  Effect.gen(function* () {
    const context = yield* McpSchema.McpRequestContext;
    if (context.requestState === undefined)
      return new McpSchema.InputRequired({
        inputRequests: { confirm: elicit("What is your name?", "name") },
        requestState: "request-state-v1",
      });
    return context.requestState === "request-state-v1" &&
      context.inputResponses?.["confirm"] !== undefined
      ? result("state-ok")
      : yield* invalid("Invalid requestState or missing confirm response");
  });
const tamperedStateHandler = () =>
  Effect.gen(function* () {
    const context = yield* McpSchema.McpRequestContext;
    if (context.requestState === undefined)
      return new McpSchema.InputRequired({
        inputRequests: { confirm: elicit("What is your name?", "name") },
        requestState: "signed-state:7f6c86f6",
      });
    return context.requestState === "signed-state:7f6c86f6" &&
      context.inputResponses?.["confirm"] !== undefined
      ? result("Validated state accepted.")
      : yield* invalid("requestState integrity check failed");
  });
const multiRoundHandler = () =>
  Effect.gen(function* () {
    const context = yield* McpSchema.McpRequestContext;
    if (context.requestState === undefined)
      return new McpSchema.InputRequired({
        inputRequests: { step1: elicit("What is your name?", "name") },
        requestState: "round-1",
      });
    if (
      context.requestState === "round-1" &&
      context.inputResponses?.["step1"] !== undefined
    )
      return new McpSchema.InputRequired({
        inputRequests: {
          step2: elicit("What is your favorite color?", "color"),
        },
        requestState: "round-2",
      });
    return context.requestState === "round-2" &&
      context.inputResponses?.["step2"] !== undefined
      ? result("Multi-round input completed.")
      : yield* invalid("Invalid multi-round requestState or input response");
  });

const StateMachineRegistration = Layer.effectDiscard(
  McpServer.McpServer.use((mcp) =>
    Effect.gen(function* () {
      yield* mcp.addTool({
        tool: tools.state,
        annotations: Context.empty(),
        handle: requestStateHandler,
      });
      yield* mcp.addTool({
        tool: tools.tampered,
        annotations: Context.empty(),
        handle: tamperedStateHandler,
      });
      yield* mcp.addTool({
        tool: tools.multiple,
        annotations: Context.empty(),
        handle: () =>
          McpSchema.McpRequestContext.useSync((context) =>
            context.requestState === "multiple-inputs-v1" &&
            ["user_name", "greeting", "client_roots"].every(
              (key) => context.inputResponses?.[key] !== undefined,
            )
              ? result("All requested client input was received.")
              : new McpSchema.InputRequired({
                  inputRequests: {
                    user_name: elicit("What is your name?", "name"),
                    greeting: {
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
                    client_roots: { method: "roots/list", params: {} },
                  },
                  requestState: "multiple-inputs-v1",
                }),
          ),
      });
      yield* mcp.addTool({
        tool: tools.rounds,
        annotations: Context.empty(),
        handle: multiRoundHandler,
      });
    }),
  ),
);
const ScenarioLive = StateMachineRegistration.pipe(
  Layer.provideMerge(server("mrtr-state-machine-http")),
);
const MainLive = ScenarioLive.pipe(
  HttpRouter.serve,
  HttpServer.withLogAddress,
  Layer.provide(BunHttpServer.layerConfig(McpServerConfig)),
);
const main = Layer.launch(MainLive).pipe(Effect.satisfiesServicesType<never>());
BunRuntime.runMain(main);
