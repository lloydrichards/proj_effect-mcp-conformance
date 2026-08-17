import { BunHttpServer, BunRuntime } from "@effect/platform-bun";
import { Context, Effect, Layer } from "effect";
import { McpSchema, McpServer } from "effect/unstable/ai";
import { HttpRouter, HttpServer } from "effect/unstable/http";
import { McpServerConfig, server } from "@repo/mcp-fixture";

const scenario = Layer.effectDiscard(
  Effect.gen(function* () {
    const mcp = yield* McpServer.McpServer;
    yield* mcp.addTool({
      tool: new McpSchema.Tool({
        name: "test_image_content",
        description: "Returns a PNG image.",
        inputSchema: { type: "object" },
      }),
      annotations: Context.empty(),
      handle: () =>
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
        ),
    });
  }),
).pipe(Layer.provideMerge(server("tools-call-image")));
const program = scenario.pipe(
  HttpRouter.serve,
  HttpServer.withLogAddress,
  Layer.provide(BunHttpServer.layerConfig(McpServerConfig)),
  Layer.launch,
  Effect.satisfiesServicesType<never>(),
);
BunRuntime.runMain(program);
