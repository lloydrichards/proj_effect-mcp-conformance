import { BunHttpServer, BunRuntime } from "@effect/platform-bun";
import { Effect, Layer } from "effect";
import { McpServer } from "effect/ai";
import { HttpRouter, HttpServer } from "effect/http";
import { McpProtocolConfig, McpServerConfig } from "@repo/mcp-fixture";

const ResourceRegistration = Layer.effectDiscard(
  Effect.gen(function* () {
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
        "This is the content of the static text resource.",
      ),
    });
  }),
);

const McpHttpLive = Effect.map(
  McpProtocolConfig,
  ({ protocols, allowedOrigins }) =>
    McpServer.layerHttp({
      name: "Effect MCP fixture: resources-list-II",
      version: "0.1.0",
      path: "/mcp",
      protocols,
      allowedOrigins,
    }),
).pipe(Layer.unwrap);

const ScenarioLive = ResourceRegistration.pipe(Layer.provideMerge(McpHttpLive));

const MainLive = ScenarioLive.pipe(
  HttpRouter.serve,
  HttpServer.withLogAddress,
  Layer.provide(BunHttpServer.layerConfig(McpServerConfig)),
);

const main = Layer.launch(MainLive).pipe(Effect.satisfiesServicesType<never>());

BunRuntime.runMain(main);
