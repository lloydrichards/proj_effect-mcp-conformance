import { BunHttpServer, BunRuntime } from "@effect/platform-bun";
import { Effect, Layer, Schema } from "effect";
import { McpSchema, McpServer } from "effect/ai";
import { HttpRouter, HttpServer } from "effect/http";
import { McpProtocolConfig, McpServerConfig } from "@repo/mcp-fixture";

const EmbeddedResourcePrompt = McpServer.prompt({
  name: "test_prompt_with_embedded_resource",
  description: "A prompt with an embedded resource.",
  parameters: { resourceUri: Schema.String },
  content: ({ resourceUri }) =>
    Effect.succeed([
      McpSchema.PromptMessage.make({
        role: "user",
        content: McpSchema.EmbeddedResource.make({
          type: "resource",
          resource: McpSchema.TextResourceContents.make({
            uri: resourceUri,
            mimeType: "text/plain",
            text: "Embedded resource content for testing.",
          }),
        }),
      }),
    ]),
});

const McpHttpLive = Effect.map(
  McpProtocolConfig,
  ({ protocols, allowedOrigins }) =>
    McpServer.layerHttp({
      name: "Effect MCP fixture: prompts-get-embedded-resource",
      version: "0.1.0",
      path: "/mcp",
      protocols,
      allowedOrigins,
    }),
).pipe(Layer.unwrap);

const ScenarioLive = EmbeddedResourcePrompt.pipe(
  Layer.provideMerge(McpHttpLive),
);

const MainLive = ScenarioLive.pipe(
  HttpRouter.serve,
  HttpServer.withLogAddress,
  Layer.provide(BunHttpServer.layerConfig(McpServerConfig)),
);

const main = Layer.launch(MainLive).pipe(Effect.satisfiesServicesType<never>());

BunRuntime.runMain(main);
