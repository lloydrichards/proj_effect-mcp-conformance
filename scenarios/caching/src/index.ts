import { BunHttpServer, BunRuntime } from "@effect/platform-bun";
import { Effect, Layer, Schema } from "effect";
import { McpSchema, McpServer, Tool, Toolkit } from "effect/unstable/ai";
import { HttpRouter, HttpServer } from "effect/unstable/http";
import { McpServerConfig, server } from "@repo/mcp-fixture";

const CacheProbeTool = Tool.make("cache_probe", {
  description: "A tool listed by the caching conformance scenario.",
  parameters: Schema.Struct({ input: Schema.optional(Schema.String) }),
  success: Schema.String,
});

const CacheProbeToolkit = Toolkit.make(CacheProbeTool);

const CacheProbeHandlers = CacheProbeToolkit.toLayer({
  cache_probe: () => Effect.succeed("cache probe"),
});

const CacheProbeFeatures = McpServer.toolkit(CacheProbeToolkit).pipe(
  Layer.provide(CacheProbeHandlers),
);

const CacheProbePrompt = McpServer.prompt({
  name: "cache-probe",
  description: "A prompt listed by the caching conformance scenario.",
  content: () => Effect.succeed("Cache probe prompt."),
});

const CacheProbeResource = McpServer.resource({
  uri: "test://cache-probe",
  name: "cache-probe",
  description: "A resource read by the caching conformance scenario.",
  mimeType: "text/plain",
  content: Effect.succeed(
    McpSchema.ReadResourceResult.make({
      contents: [
        {
          uri: "test://cache-probe",
          mimeType: "text/plain",
          text: "Cache probe resource.",
        },
      ],
    }),
  ),
});

const CacheProbeResourceTemplate =
  McpServer.resource`test://cache-probe/${McpSchema.param("id", Schema.String)}`(
    {
      name: "cache-probe-template",
      description: "A template listed by the caching conformance scenario.",
      mimeType: "text/plain",
      content: (uri, id) =>
        Effect.succeed(
          McpSchema.ReadResourceResult.make({
            contents: [{ uri, mimeType: "text/plain", text: id }],
          }),
        ),
    },
  );

const ScenarioFeatures = Layer.mergeAll(
  CacheProbeFeatures,
  CacheProbePrompt,
  CacheProbeResource,
  CacheProbeResourceTemplate,
);

const ScenarioLive = ScenarioFeatures.pipe(
  Layer.provideMerge(server("caching")),
);

const MainLive = ScenarioLive.pipe(
  HttpRouter.serve,
  HttpServer.withLogAddress,
  Layer.provide(BunHttpServer.layerConfig(McpServerConfig)),
);

const main = Layer.launch(MainLive).pipe(Effect.satisfiesServicesType<never>());

BunRuntime.runMain(main);
