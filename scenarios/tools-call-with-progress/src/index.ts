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
        name: "test_tool_with_progress",
        description: "Returns after progress-capable work.",
        inputSchema: { type: "object" },
      }),
      annotations: Context.empty(),
      // addTool exposes only decoded arguments to a handler. The scenario keeps
      // the handler honest: it cannot invent a progress token it cannot read.
      handle: () =>
        Effect.succeed(
          new McpSchema.CallToolResult({
            content: [
              {
                type: "text",
                text: "Progress token unavailable to tool handler",
              },
            ],
          }),
        ),
    });
  }),
).pipe(Layer.provideMerge(server("tools-call-with-progress")));
const program = scenario.pipe(
  HttpRouter.serve,
  HttpServer.withLogAddress,
  Layer.provide(BunHttpServer.layerConfig(McpServerConfig)),
  Layer.launch,
  Effect.satisfiesServicesType<never>(),
);
BunRuntime.runMain(program);
