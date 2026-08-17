import { BunHttpServer, BunRuntime } from "@effect/platform-bun";
import { Effect, Layer } from "effect";
import { McpSchema, McpServer } from "effect/unstable/ai";
import { HttpRouter, HttpServer } from "effect/unstable/http";
import { McpServerConfig, server } from "@repo/mcp-fixture";

const scenario = McpServer.resource({
  uri: "test://static-binary",
  name: "static-binary",
  description: "A static binary resource.",
  mimeType: "image/png",
  content: Effect.succeed(
    McpSchema.ReadResourceResult.make({
      contents: [
        {
          uri: "test://static-binary",
          mimeType: "image/png",
          blob: new Uint8Array([0, 1, 2, 3]),
        },
      ],
    }),
  ),
}).pipe(Layer.provideMerge(server("resources-read-binary")));

const program = scenario.pipe(
  HttpRouter.serve,
  HttpServer.withLogAddress,
  Layer.provide(BunHttpServer.layerConfig(McpServerConfig)),
  Layer.launch,
  Effect.satisfiesServicesType<never>(),
);

BunRuntime.runMain(program);
