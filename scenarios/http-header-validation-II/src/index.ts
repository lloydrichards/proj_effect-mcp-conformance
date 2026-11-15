import { BunHttpServer, BunRuntime } from "@effect/platform-bun";
import { Context, Effect, Layer } from "effect";
import { McpSchema, McpServer } from "effect/ai";
import { HttpRouter, HttpServer } from "effect/http";
import { McpProtocolConfig, McpServerConfig } from "@repo/mcp-fixture";

const HeaderTool = new McpSchema.Tool({
  name: "test_header_validation",
  description: "Exercises standard MCP routing headers.",
  inputSchema: { type: "object" },
});
const CustomHeaderTool = new McpSchema.Tool({
  name: "test_custom_header_validation",
  description: "Exercises an MCP parameter mirrored in an HTTP header.",
  inputSchema: {
    type: "object",
    properties: { message: { type: "string", "x-mcp-header": "message" } },
    required: ["message"],
  },
});
const HeaderToolRegistration = Layer.effectDiscard(
  McpServer.McpServer.use((mcp) =>
    Effect.gen(function* () {
      yield* mcp.addTool({
        tool: HeaderTool,
        annotations: Context.empty(),
        handle: () =>
          Effect.succeed(
            new McpSchema.CallToolResult({
              content: [{ type: "text", text: "Headers accepted" }],
            }),
          ),
      });
      yield* mcp.addTool({
        tool: CustomHeaderTool,
        annotations: Context.empty(),
        handle: (arguments_) =>
          Effect.succeed(
            new McpSchema.CallToolResult({
              content: [{ type: "text", text: String(arguments_["message"]) }],
            }),
          ),
      });
    }),
  ),
);
const McpHttpLive = Effect.map(
  McpProtocolConfig,
  ({ protocols, allowedOrigins }) =>
    McpServer.layerHttp({
      name: "Effect MCP fixture: http-header-validation-II",
      version: "0.1.0",
      path: "/mcp",
      protocols,
      allowedOrigins,
    }),
).pipe(Layer.unwrap);

const ScenarioLive = HeaderToolRegistration.pipe(
  Layer.provideMerge(McpHttpLive),
);

const MainLive = ScenarioLive.pipe(
  HttpRouter.serve,
  HttpServer.withLogAddress,
  Layer.provide(BunHttpServer.layerConfig(McpServerConfig)),
);

const main = Layer.launch(MainLive).pipe(Effect.satisfiesServicesType<never>());

BunRuntime.runMain(main);
