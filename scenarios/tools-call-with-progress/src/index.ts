import { BunHttpServer, BunRuntime } from "@effect/platform-bun";
import { Context, Effect, Layer } from "effect";
import { McpSchema, McpServer } from "effect/ai";
import { HttpRouter, HttpServer } from "effect/http";
import { McpProtocolConfig, McpServerConfig } from "@repo/mcp-fixture";

const ProgressTool = new McpSchema.Tool({
  name: "test_tool_with_progress",
  description: "Returns after progress-capable work.",
  inputSchema: { type: "object" },
});

const makeProgressHandler = (mcp: McpServer.McpServer["Service"]) => () =>
  Effect.gen(function* () {
    const context = yield* McpSchema.McpRequestContext;
    const progressToken = context.requestMetadata?.progressToken;
    if (
      typeof progressToken === "string" ||
      typeof progressToken === "number"
    ) {
      for (const progress of [0, 50, 100]) {
        yield* mcp.notifications["notifications/progress"]({
          progressToken,
          progress,
          total: 100,
        });
        if (progress < 100) yield* Effect.sleep("50 millis");
      }
      yield* Effect.sleep("10 millis");
    }
    return new McpSchema.CallToolResult({
      content: [
        {
          type: "text",
          text: "Progress completed",
        },
      ],
    });
  });

const ProgressToolRegistration = Layer.effectDiscard(
  McpServer.McpServer.use((mcp) =>
    mcp.addTool({
      tool: ProgressTool,
      annotations: Context.empty(),
      handle: makeProgressHandler(mcp),
    }),
  ),
);

const McpHttpLive = Effect.map(
  McpProtocolConfig,
  ({ protocols, allowedOrigins }) =>
    McpServer.layerHttp({
      name: "Effect MCP fixture: tools-call-with-progress",
      version: "0.1.0",
      path: "/mcp",
      protocols,
      allowedOrigins,
    }),
).pipe(Layer.unwrap);

const ScenarioLive = ProgressToolRegistration.pipe(
  Layer.provideMerge(McpHttpLive),
);

const MainLive = ScenarioLive.pipe(
  HttpRouter.serve,
  HttpServer.withLogAddress,
  Layer.provide(BunHttpServer.layerConfig(McpServerConfig)),
);

const main = Layer.launch(MainLive).pipe(Effect.satisfiesServicesType<never>());

BunRuntime.runMain(main);
