import { BunHttpServer, BunRuntime } from "@effect/platform-bun";
import { Context, Effect, Layer } from "effect";
import { McpSchema, McpServer } from "effect/unstable/ai";
import { HttpRouter, HttpServer } from "effect/unstable/http";
import { McpServerConfig, server } from "@repo/mcp-fixture";

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
const HardenedRegistration = Layer.effectDiscard(
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
const ScenarioLive = HardenedRegistration.pipe(
  Layer.provideMerge(server("hardened-http")),
);
const MainLive = ScenarioLive.pipe(
  HttpRouter.serve,
  HttpServer.withLogAddress,
  Layer.provide(BunHttpServer.layerConfig(McpServerConfig)),
);
const main = Layer.launch(MainLive).pipe(Effect.satisfiesServicesType<never>());
BunRuntime.runMain(main);
