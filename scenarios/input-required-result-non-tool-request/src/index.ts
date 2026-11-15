import { BunHttpServer, BunRuntime } from "@effect/platform-bun";
import { Context, Effect, Layer } from "effect";
import { McpSchema, McpServer } from "effect/ai";
import { HttpRouter, HttpServer } from "effect/http";
import { McpProtocolConfig, McpServerConfig } from "@repo/mcp-fixture";

const InputRequiredPrompt = new McpSchema.Prompt({
  name: "test_input_required_result_prompt",
  description: "Requests prompt context through MRTR.",
});

const handleInputRequiredPrompt = () =>
  McpSchema.McpRequestContext.useSync((context) =>
    context.inputResponses?.["user_context"] === undefined
      ? new McpSchema.InputRequired({
          inputRequests: {
            user_context: {
              method: "elicitation/create",
              params: {
                message: "What context should the prompt use?",
                requestedSchema: {
                  type: "object",
                  properties: { context: { type: "string" } },
                  required: ["context"],
                },
              },
            },
          },
        })
      : new McpSchema.GetPromptResult({
          messages: [
            {
              role: "user",
              content: {
                type: "text",
                text: "Prompt completed with client context.",
              },
            },
          ],
        }),
  );

const InputRequiredPromptRegistration = Layer.effectDiscard(
  McpServer.McpServer.use((mcp) =>
    mcp.addPrompt({
      prompt: InputRequiredPrompt,
      annotations: Context.empty(),
      completions: {},
      handle: handleInputRequiredPrompt,
    }),
  ),
);

const McpHttpLive = Effect.map(
  McpProtocolConfig,
  ({ protocols, allowedOrigins }) =>
    McpServer.layerHttp({
      name: "Effect MCP fixture: input-required-result-non-tool-request",
      version: "0.1.0",
      path: "/mcp",
      protocols,
      allowedOrigins,
    }),
).pipe(Layer.unwrap);

const ScenarioLive = InputRequiredPromptRegistration.pipe(
  Layer.provideMerge(McpHttpLive),
);

const MainLive = ScenarioLive.pipe(
  HttpRouter.serve,
  HttpServer.withLogAddress,
  Layer.provide(BunHttpServer.layerConfig(McpServerConfig)),
);

const main = Layer.launch(MainLive).pipe(Effect.satisfiesServicesType<never>());

BunRuntime.runMain(main);
