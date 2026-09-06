import { BunHttpServer, BunRuntime } from "@effect/platform-bun";
import { McpServerConfig, server } from "@repo/mcp-fixture";
import { Effect, Layer, Schema } from "effect";
import { McpSchema, McpServer, Tool, Toolkit } from "effect/unstable/ai";
import { HttpRouter, HttpServer } from "effect/unstable/http";

const ToolDiscoveryTool = Tool.make("test_tool", {
  description: "A minimal tool used to verify MCP tool discovery.",
  parameters: Schema.Struct({ input: Schema.optional(Schema.String) }),
  success: Schema.String,
});

const PublicToolkit = Toolkit.make(ToolDiscoveryTool);

const PublicHandlers = PublicToolkit.toLayer({
  test_tool: () => Effect.succeed("tool discovery is working"),
});

const registerPublicCapabilities = Effect.gen(function* () {
  yield* McpServer.registerToolkit(PublicToolkit);
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
  yield* McpServer.registerResource({
    uri: "test://listed-resource",
    name: "listed-resource",
    description: "A resource used to verify resource discovery.",
    mimeType: "text/plain",
    content: Effect.succeed("A listed resource."),
  });
  yield* McpServer.registerResource({
    uri: "test://static-text",
    name: "static-text",
    description: "A static text resource.",
    mimeType: "text/plain",
    content: Effect.succeed(
      McpSchema.ReadResourceResult.make({
        contents: [
          {
            uri: "test://static-text",
            mimeType: "text/plain",
            text: "This is the content of the static text resource.",
          },
        ],
      }),
    ),
  });
});

const PublicCapabilities = Layer.effectDiscard(registerPublicCapabilities).pipe(
  Layer.provide(PublicHandlers),
);

const ScenarioLive = PublicCapabilities.pipe(
  Layer.provideMerge(server("imperative-public-api-http")),
);

const MainLive = ScenarioLive.pipe(
  HttpRouter.serve,
  HttpServer.withLogAddress,
  Layer.provide(BunHttpServer.layerConfig(McpServerConfig)),
);

const main = Layer.launch(MainLive).pipe(Effect.satisfiesServicesType<never>());

BunRuntime.runMain(main);
