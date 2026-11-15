import { BunHttpServer, BunRuntime } from "@effect/platform-bun";
import { Context, Effect, Layer } from "effect";
import { McpSchema, McpServer } from "effect/ai";
import { HttpRouter, HttpServer } from "effect/http";
import { McpProtocolConfig, McpServerConfig } from "@repo/mcp-fixture";
import { whitePixelPng } from "@repo/mcp-fixture/media";

const ImageContentTool = new McpSchema.Tool({
  name: "test_image_content",
  description: "Returns a PNG image.",
  inputSchema: { type: "object" },
});

const imageContentHandler = () =>
  Effect.succeed(
    new McpSchema.CallToolResult({
      content: [
        {
          type: "image",
          data: whitePixelPng,
          mimeType: "image/png",
        },
      ],
    }),
  );

const ImageContentRegistration = Layer.effectDiscard(
  McpServer.McpServer.use((mcp) =>
    mcp.addTool({
      tool: ImageContentTool,
      annotations: Context.empty(),
      handle: imageContentHandler,
    }),
  ),
);

const McpHttpLive = Effect.map(
  McpProtocolConfig,
  ({ protocols, allowedOrigins }) =>
    McpServer.layerHttp({
      name: "Effect MCP fixture: tools-call-image",
      version: "0.1.0",
      path: "/mcp",
      protocols,
      allowedOrigins,
    }),
).pipe(Layer.unwrap);

const ScenarioLive = ImageContentRegistration.pipe(
  Layer.provideMerge(McpHttpLive),
);

const MainLive = ScenarioLive.pipe(
  HttpRouter.serve,
  HttpServer.withLogAddress,
  Layer.provide(BunHttpServer.layerConfig(McpServerConfig)),
);

const main = Layer.launch(MainLive).pipe(Effect.satisfiesServicesType<never>());

BunRuntime.runMain(main);
