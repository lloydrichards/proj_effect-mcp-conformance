import { BunHttpServer, BunRuntime } from "@effect/platform-bun";
import { Effect, Layer } from "effect";
import { McpServer } from "effect/unstable/ai";
import { HttpRouter, HttpServer } from "effect/unstable/http";
import { McpServerConfig, server } from "@repo/mcp-fixture";

const scenario = McpServer.resource({
  uri: "test://listed-resource",
  name: "listed-resource",
  description: "A resource used to verify resource discovery.",
  mimeType: "text/plain",
  content: Effect.succeed("A listed resource."),
}).pipe(Layer.provideMerge(server("resources-list")));

const program = scenario.pipe(
  HttpRouter.serve,
  HttpServer.withLogAddress,
  Layer.provide(BunHttpServer.layerConfig(McpServerConfig)),
  Layer.launch,
  Effect.satisfiesServicesType<never>(),
);

BunRuntime.runMain(program);
