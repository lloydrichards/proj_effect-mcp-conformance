import { BunHttpServer, BunRuntime } from "@effect/platform-bun";
import { Context, Effect, Layer } from "effect";
import { McpSchema, McpServer } from "effect/ai";
import { HttpRouter, HttpServer } from "effect/http";
import { McpProtocolConfig, McpServerConfig } from "@repo/mcp-fixture";

const ToolDiscoveryTool = new McpSchema.Tool({
  name: "test_tool",
  description: "A minimal tool used to verify MCP tool discovery.",
  inputSchema: {
    type: "object",
    properties: { input: { type: "string" } },
  },
});

const ToolDiscoveryRegistration = Layer.effectDiscard(
  McpServer.McpServer.use((registry) =>
    registry.addTool({
      tool: ToolDiscoveryTool,
      annotations: Context.empty(),
      handle: () =>
        Effect.succeed(
          new McpSchema.CallToolResult({
            content: [{ type: "text", text: "tool discovery is working" }],
          }),
        ),
    }),
  ),
);

const McpHttpLive = Effect.map(
  McpProtocolConfig,
  ({ protocols, allowedOrigins }) =>
    McpServer.layerHttp({
      name: "Effect MCP fixture: tools-list-IV",
      version: "0.1.0",
      path: "/mcp",
      protocols,
      allowedOrigins,
    }),
).pipe(Layer.unwrap);

const ScenarioLive = ToolDiscoveryRegistration.pipe(
  Layer.provideMerge(McpHttpLive),
);

const MainLive = ScenarioLive.pipe(
  HttpRouter.serve,
  HttpServer.withLogAddress,
  Layer.provide(BunHttpServer.layerConfig(McpServerConfig)),
);

const main = Layer.launch(MainLive).pipe(Effect.satisfiesServicesType<never>());

BunRuntime.runMain(main);
