import { BunHttpServer, BunRuntime } from "@effect/platform-bun";
import { Effect, Layer } from "effect";
import { McpServer } from "effect/unstable/ai";
import { HttpRouter, HttpServer } from "effect/unstable/http";
import { McpServerConfig, server } from "@repo/mcp-fixture";

const ListedResource = McpServer.resource({
  uri: "test://listed-resource",
  name: "listed-resource",
  description: "A resource used to verify resource discovery.",
  mimeType: "text/plain",
  content: Effect.succeed("A listed resource."),
});

const ScenarioLive = ListedResource.pipe(
  Layer.provideMerge(server("resources-list")),
);

const MainLive = ScenarioLive.pipe(
  HttpRouter.serve,
  HttpServer.withLogAddress,
  Layer.provide(BunHttpServer.layerConfig(McpServerConfig)),
);

const main = Layer.launch(MainLive).pipe(Effect.satisfiesServicesType<never>());

BunRuntime.runMain(main);
