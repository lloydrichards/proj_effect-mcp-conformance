import { BunHttpServer, BunRuntime } from "@effect/platform-bun";
import { Effect, Layer, Schema } from "effect";
import { McpServer } from "effect/ai";
import { HttpRouter, HttpServer } from "effect/http";
import { McpProtocolConfig, McpServerConfig } from "@repo/mcp-fixture";

const PromptRegistration = Layer.effectDiscard(
  Effect.gen(function* () {
    yield* McpServer.registerPrompt({
      name: "test-listed-prompt",
      description: "A prompt used to verify prompt discovery.",
      content: () => Effect.succeed("Listed prompt."),
    });
    yield* McpServer.registerPrompt({
      name: "test_simple_prompt",
      description: "A simple prompt.",
      content: () => Effect.succeed("This is a simple prompt for testing."),
    });
    yield* McpServer.registerPrompt({
      name: "test_prompt_with_arguments",
      description: "A prompt with required arguments.",
      parameters: { arg1: Schema.String, arg2: Schema.optional(Schema.String) },
      completion: { arg1: () => Effect.succeed(["test"]) },
      content: ({ arg1, arg2 }) =>
        Effect.succeed(
          arg2 === undefined
            ? `Prompt argument: ${arg1}`
            : `Prompt with arguments: arg1='${arg1}', arg2='${arg2}'`,
        ),
    });
  }),
);

const McpHttpLive = Effect.map(
  McpProtocolConfig,
  ({ protocols, allowedOrigins }) =>
    McpServer.layerHttp({
      name: "Effect MCP fixture: prompts-list-II",
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
