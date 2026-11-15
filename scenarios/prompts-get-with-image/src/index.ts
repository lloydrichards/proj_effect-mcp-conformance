import { BunHttpServer, BunRuntime } from "@effect/platform-bun";
import { Effect, Layer } from "effect";
import { McpSchema, McpServer } from "effect/ai";
import { HttpRouter, HttpServer } from "effect/http";
import { whitePixelPng } from "@repo/mcp-fixture/media";
import { McpServerConfig, server } from "@repo/mcp-fixture";

const PromptWithImage = McpServer.prompt({
  name: "test_prompt_with_image",
  description: "A prompt with image content.",
  content: () =>
    Effect.succeed([
      McpSchema.PromptMessage.make({
        role: "user",
        content: McpSchema.ImageContent.make({
          type: "image",
          data: whitePixelPng,
          mimeType: "image/png",
        }),
      }),
    ]),
});

const ScenarioLive = PromptWithImage.pipe(
  Layer.provideMerge(server("prompts-get-with-image")),
);

const MainLive = ScenarioLive.pipe(
  HttpRouter.serve,
  HttpServer.withLogAddress,
  Layer.provide(BunHttpServer.layerConfig(McpServerConfig)),
);

const main = Layer.launch(MainLive).pipe(Effect.satisfiesServicesType<never>());

BunRuntime.runMain(main);
