import { BunHttpServer, BunRuntime } from "@effect/platform-bun";
import { Context, Effect, Layer } from "effect";
import { McpSchema, McpServer } from "effect/ai";
import { HttpRouter, HttpServer } from "effect/http";
import { McpProtocolConfig, McpServerConfig } from "@repo/mcp-fixture";

const SamplingTool = new McpSchema.Tool({
  name: "test_input_required_result_sampling",
  description: "Requests sampling through MRTR.",
  inputSchema: { type: "object" },
});

const handleSampling = () =>
  McpSchema.McpRequestContext.useSync((context) =>
    context.inputResponses?.["capital_question"] === undefined
      ? new McpSchema.InputRequired({
          inputRequests: {
            capital_question: {
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
          },
        })
      : new McpSchema.CallToolResult({
          content: [{ type: "text", text: "The capital is Paris." }],
        }),
  );

const SamplingRegistration = Layer.effectDiscard(
  McpServer.McpServer.use((mcp) =>
    mcp.addTool({
      tool: SamplingTool,
      annotations: Context.empty(),
      handle: handleSampling,
    }),
  ),
);

const McpHttpLive = Effect.map(
  McpProtocolConfig,
  ({ protocols, allowedOrigins }) =>
    McpServer.layerHttp({
      name: "Effect MCP fixture: input-required-result-basic-sampling",
      version: "0.1.0",
      path: "/mcp",
      protocols,
      allowedOrigins,
    }),
).pipe(Layer.unwrap);

const ScenarioLive = SamplingRegistration.pipe(Layer.provideMerge(McpHttpLive));

const MainLive = ScenarioLive.pipe(
  HttpRouter.serve,
  HttpServer.withLogAddress,
  Layer.provide(BunHttpServer.layerConfig(McpServerConfig)),
);

const main = Layer.launch(MainLive).pipe(Effect.satisfiesServicesType<never>());

BunRuntime.runMain(main);
