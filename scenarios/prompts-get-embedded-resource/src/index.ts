import { BunHttpServer, BunRuntime } from "@effect/platform-bun";
import { Effect, Layer, Schema } from "effect";
import { McpSchema, McpServer } from "effect/unstable/ai";
import { HttpRouter, HttpServer } from "effect/unstable/http";
import { McpServerConfig, server } from "@repo/mcp-fixture";

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

const ScenarioLive = EmbeddedResourcePrompt.pipe(
  Layer.provideMerge(server("prompts-get-embedded-resource")),
);

const MainLive = ScenarioLive.pipe(
  HttpRouter.serve,
  HttpServer.withLogAddress,
  Layer.provide(BunHttpServer.layerConfig(McpServerConfig)),
);

const main = Layer.launch(MainLive).pipe(Effect.satisfiesServicesType<never>());

BunRuntime.runMain(main);
