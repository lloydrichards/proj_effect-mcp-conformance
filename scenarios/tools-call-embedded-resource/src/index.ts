import { BunHttpServer, BunRuntime } from "@effect/platform-bun";
import { Context, Effect, Layer } from "effect";
import { McpSchema, McpServer } from "effect/unstable/ai";
import { HttpRouter, HttpServer } from "effect/unstable/http";
import { McpServerConfig, server } from "@repo/mcp-fixture";

const EmbeddedResourceTool = new McpSchema.Tool({
  name: "test_embedded_resource",
  description: "Returns embedded text.",
  inputSchema: { type: "object" },
});

const embeddedResourceHandler = () =>
  Effect.succeed(
    new McpSchema.CallToolResult({
      content: [
        {
          type: "resource",
          resource: {
            uri: "test://resource",
            mimeType: "text/plain",
            text: "Embedded resource content",
          },
        },
      ],
    }),
  );

const EmbeddedResourceRegistration = Layer.effectDiscard(
  McpServer.McpServer.use((mcp) =>
    mcp.addTool({
      tool: EmbeddedResourceTool,
      annotations: Context.empty(),
      handle: embeddedResourceHandler,
    }),
  ),
);

const ScenarioLive = EmbeddedResourceRegistration.pipe(
  Layer.provideMerge(server("tools-call-embedded-resource")),
);

const MainLive = ScenarioLive.pipe(
  HttpRouter.serve,
  HttpServer.withLogAddress,
  Layer.provide(BunHttpServer.layerConfig(McpServerConfig)),
);

const main = Layer.launch(MainLive).pipe(Effect.satisfiesServicesType<never>());

BunRuntime.runMain(main);
