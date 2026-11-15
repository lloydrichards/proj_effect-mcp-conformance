import { BunHttpServer, BunRuntime } from "@effect/platform-bun";
import { Context, Effect, Layer } from "effect";
import { McpSchema, McpServer } from "effect/ai";
import { HttpRouter, HttpServer } from "effect/http";
import { McpProtocolConfig, McpServerConfig } from "@repo/mcp-fixture";
import { whitePixelPng } from "@repo/mcp-fixture/media";

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
          data: whitePixelPng,
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

const McpHttpLive = Effect.map(
  McpProtocolConfig,
  ({ protocols, allowedOrigins }) =>
    McpServer.layerHttp({
      name: "Effect MCP fixture: tools-call-mixed-content",
      version: "0.1.0",
      path: "/mcp",
      protocols,
      allowedOrigins,
    }),
).pipe(Layer.unwrap);

const ScenarioLive = MixedContentRegistration.pipe(
  Layer.provideMerge(McpHttpLive),
);

const MainLive = ScenarioLive.pipe(
  HttpRouter.serve,
  HttpServer.withLogAddress,
  Layer.provide(BunHttpServer.layerConfig(McpServerConfig)),
);

const main = Layer.launch(MainLive).pipe(Effect.satisfiesServicesType<never>());

BunRuntime.runMain(main);
