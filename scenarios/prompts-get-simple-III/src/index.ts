import { BunHttpServer, BunRuntime } from "@effect/platform-bun";
import { Context, Effect, Layer } from "effect";
import { McpSchema, McpServer } from "effect/ai";
import { HttpRouter, HttpServer } from "effect/http";
import { McpProtocolConfig, McpServerConfig } from "@repo/mcp-fixture";

const SimplePrompt = new McpSchema.Prompt({
  name: "test_simple_prompt",
  description: "A simple prompt.",
});

const PromptRegistration = Layer.effectDiscard(
  McpServer.McpServer.use((registry) =>
    registry.addPrompt({
      prompt: SimplePrompt,
      annotations: Context.empty(),
      completions: {},
      handle: () =>
        Effect.succeed(
          McpSchema.GetPromptResult.make({
            messages: [
              {
                role: "user",
                content: {
                  type: "text",
                  text: "This is a simple prompt for testing.",
                },
              },
            ],
          }),
        ),
    }),
  ),
);

const McpHttpLive = Effect.map(
  McpProtocolConfig,
  ({ protocols, allowedOrigins }) =>
    McpServer.layerHttp({
      name: "Effect MCP fixture: prompts-get-simple-III",
      version: "0.1.0",
      path: "/mcp",
      protocols,
      allowedOrigins,
    }),
).pipe(Layer.unwrap);

const ScenarioLive = PromptRegistration.pipe(Layer.provideMerge(McpHttpLive));

const MainLive = ScenarioLive.pipe(
  HttpRouter.serve,
  HttpServer.withLogAddress,
  Layer.provide(BunHttpServer.layerConfig(McpServerConfig)),
);

const main = Layer.launch(MainLive).pipe(Effect.satisfiesServicesType<never>());

BunRuntime.runMain(main);
