import { BunHttpServer, BunRuntime } from "@effect/platform-bun";
import { Context, Effect, Layer } from "effect";
import { McpSchema, McpServer } from "effect/ai";
import { HttpRouter, HttpServer } from "effect/http";
import { McpProtocolConfig, McpServerConfig } from "@repo/mcp-fixture";

const SimpleTextTool = new McpSchema.Tool({
  name: "test_simple_text",
  description: "Returns test text.",
  inputSchema: { type: "object" },
});

const simpleTextHandler = () =>
  Effect.succeed(
    new McpSchema.CallToolResult({
      content: [
        {
          type: "text",
          text: "This is a simple text response for testing.",
        },
      ],
    }),
  );

const SimpleTextRegistration = Layer.effectDiscard(
  McpServer.McpServer.use((mcp) =>
    mcp.addTool({
      tool: SimpleTextTool,
      annotations: Context.empty(),
      handle: simpleTextHandler,
    }),
  ),
);

// layerHttp builds these registrations when it acquires the endpoint.
const ScenarioLive = Effect.map(
  McpProtocolConfig,
  ({ protocols, allowedOrigins }) =>
    McpServer.layerHttp({
      name: "Effect MCP fixture: tools-call-simple-text-II",
      version: "0.1.0",
      path: "/mcp",
      protocols,
      allowedOrigins,
      registrations: SimpleTextRegistration,
    }),
).pipe(Layer.unwrap);

const MainLive = ScenarioLive.pipe(
  HttpRouter.serve,
  HttpServer.withLogAddress,
  Layer.provide(BunHttpServer.layerConfig(McpServerConfig)),
);

const main = Layer.launch(MainLive).pipe(Effect.satisfiesServicesType<never>());

BunRuntime.runMain(main);
