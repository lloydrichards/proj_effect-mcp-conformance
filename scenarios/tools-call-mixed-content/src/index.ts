import { BunHttpServer, BunRuntime } from "@effect/platform-bun";
import { Context, Effect, Layer } from "effect";
import { McpSchema, McpServer } from "effect/unstable/ai";
import { HttpRouter, HttpServer } from "effect/unstable/http";
import { McpServerConfig, server } from "@repo/mcp-fixture";

const MixedContentTool = new McpSchema.Tool({
  name: "test_multiple_content_types",
  description: "Returns text, image, and a resource.",
  inputSchema: { type: "object" },
});

const mixedContentHandler = () =>
  Effect.succeed(
    new McpSchema.CallToolResult({
      content: [
        { type: "text", text: "Mixed content" },
        {
          type: "image",
          data: new Uint8Array([137, 80, 78, 71]),
          mimeType: "image/png",
        },
        {
          type: "resource",
          resource: {
            uri: "test://mixed",
            mimeType: "text/plain",
            text: "Mixed embedded resource",
          },
        },
      ],
    }),
  );

const MixedContentRegistration = Layer.effectDiscard(
  McpServer.McpServer.use((mcp) =>
    mcp.addTool({
      tool: MixedContentTool,
      annotations: Context.empty(),
      handle: mixedContentHandler,
    }),
  ),
);

const ScenarioLive = MixedContentRegistration.pipe(
  Layer.provideMerge(server("tools-call-mixed-content")),
);

const MainLive = ScenarioLive.pipe(
  HttpRouter.serve,
  HttpServer.withLogAddress,
  Layer.provide(BunHttpServer.layerConfig(McpServerConfig)),
);

const main = Layer.launch(MainLive).pipe(Effect.satisfiesServicesType<never>());

BunRuntime.runMain(main);
