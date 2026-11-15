import { BunHttpServer, BunRuntime } from "@effect/platform-bun";
import { Context, Effect, Layer, Schema } from "effect";
import { McpSchema, McpServer, Tool, Toolkit } from "effect/ai";
import { HttpRouter, HttpServer } from "effect/http";
import { McpProtocolConfig, McpServerConfig } from "@repo/mcp-fixture";

const PromptWithArguments = McpServer.prompt({
  name: "test_prompt_with_arguments",
  description: "A prompt with required arguments.",
  parameters: { arg1: Schema.String, arg2: Schema.String },
  completion: { arg1: () => Effect.succeed(["test"]) },
  content: ({ arg1, arg2 }) =>
    Effect.succeed(`Prompt with arguments: arg1='${arg1}', arg2='${arg2}'`),
});

const ToolDiscoveryTool = Tool.make("test_tool", {
  description: "A minimal tool used to verify MCP tool discovery.",
  parameters: Schema.Struct({ input: Schema.optional(Schema.String) }),
  success: Schema.String,
});

const PublicToolkit = Toolkit.make(ToolDiscoveryTool);

const PublicHandlers = PublicToolkit.toLayer({
  test_tool: () => Effect.succeed("tool discovery is working"),
});

const ToolDiscovery = McpServer.toolkit(PublicToolkit).pipe(
  Layer.provide(PublicHandlers),
);

const SimpleTextTool = new McpSchema.Tool({
  name: "test_simple_text",
  description: "Returns test text.",
  inputSchema: { type: "object" },
});

const SimpleTextRegistration = Layer.effectDiscard(
  McpServer.McpServer.use((registry) =>
    registry.addTool({
      tool: SimpleTextTool,
      annotations: Context.empty(),
      handle: () =>
        Effect.succeed(
          new McpSchema.CallToolResult({
            content: [
              {
                type: "text",
                text: "This is a simple text response for testing.",
              },
            ],
          }),
        ),
    }),
  ),
);

const ListedPrompt = McpServer.prompt({
  name: "test-listed-prompt",
  description: "A prompt used to verify prompt discovery.",
  content: () => Effect.succeed("Listed prompt."),
});

const SimplePrompt = McpServer.prompt({
  name: "test_simple_prompt",
  description: "A simple prompt.",
  content: () => Effect.succeed("This is a simple prompt for testing."),
});

const ListedResource = McpServer.resource({
  uri: "test://listed-resource",
  name: "listed-resource",
  description: "A resource used to verify resource discovery.",
  mimeType: "text/plain",
  content: Effect.succeed("A listed resource."),
});

const TextResource = McpServer.resource({
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

const ScenarioFeatures = Layer.mergeAll(
  ToolDiscovery,
  SimpleTextRegistration,
  ListedPrompt,
  SimplePrompt,
  PromptWithArguments,
  ListedResource,
  TextResource,
);

const McpHttpLive = Effect.map(
  McpProtocolConfig,
  ({ protocols, allowedOrigins }) =>
    McpServer.layerHttp({
      name: "Effect MCP fixture: prompts-get-with-args-III",
      version: "0.1.0",
      path: "/mcp",
      protocols,
      allowedOrigins,
    }),
).pipe(Layer.unwrap);

const ScenarioLive = ScenarioFeatures.pipe(Layer.provideMerge(McpHttpLive));

const MainLive = ScenarioLive.pipe(
  HttpRouter.serve,
  HttpServer.withLogAddress,
  Layer.provide(BunHttpServer.layerConfig(McpServerConfig)),
);

const main = Layer.launch(MainLive).pipe(Effect.satisfiesServicesType<never>());

BunRuntime.runMain(main);
