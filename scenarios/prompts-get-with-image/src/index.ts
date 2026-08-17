import { BunHttpServer, BunRuntime } from "@effect/platform-bun";
import { Effect, Layer } from "effect";
import { McpSchema, McpServer } from "effect/unstable/ai";
import { HttpRouter, HttpServer } from "effect/unstable/http";
import { McpServerConfig, server } from "@repo/mcp-fixture";

const scenario = McpServer.prompt({
  name: "test_prompt_with_image",
  description: "A prompt with image content.",
  content: () =>
    Effect.succeed([
      McpSchema.PromptMessage.make({
        role: "user",
        content: McpSchema.ImageContent.make({
          type: "image",
          data: new Uint8Array([137, 80, 78, 71]),
          mimeType: "image/png",
        }),
      }),
    ]),
}).pipe(Layer.provideMerge(server("prompts-get-with-image")));
const program = scenario.pipe(
  HttpRouter.serve,
  HttpServer.withLogAddress,
  Layer.provide(BunHttpServer.layerConfig(McpServerConfig)),
  Layer.launch,
  Effect.satisfiesServicesType<never>(),
);
BunRuntime.runMain(program);
