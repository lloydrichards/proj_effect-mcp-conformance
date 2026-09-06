import { BunHttpServer, BunRuntime } from "@effect/platform-bun";
import { Effect, Layer } from "effect";
import { McpSchema, McpServer } from "effect/unstable/ai";
import { HttpRouter, HttpServer } from "effect/unstable/http";
import { McpServerConfig, server } from "@repo/mcp-fixture";

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

const ScenarioLive = TextResource.pipe(
  Layer.provideMerge(server("resources-read-text")),
);

const MainLive = ScenarioLive.pipe(
  HttpRouter.serve,
  HttpServer.withLogAddress,
  Layer.provide(BunHttpServer.layerConfig(McpServerConfig)),
);

const main = Layer.launch(MainLive).pipe(Effect.satisfiesServicesType<never>());

BunRuntime.runMain(main);
