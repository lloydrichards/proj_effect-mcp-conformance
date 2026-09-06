import { BunHttpServer, BunRuntime } from "@effect/platform-bun";
import { Context, Effect, Layer } from "effect";
import { McpSchema, McpServer } from "effect/unstable/ai";
import { HttpRouter, HttpServer } from "effect/unstable/http";
import { McpServerConfig, server } from "@repo/mcp-fixture";

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
          data: new Uint8Array([137, 80, 78, 71]),
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

const ScenarioLive = ImageContentRegistration.pipe(
  Layer.provideMerge(server("tools-call-image")),
);

const MainLive = ScenarioLive.pipe(
  HttpRouter.serve,
  HttpServer.withLogAddress,
  Layer.provide(BunHttpServer.layerConfig(McpServerConfig)),
);

const main = Layer.launch(MainLive).pipe(Effect.satisfiesServicesType<never>());

BunRuntime.runMain(main);
