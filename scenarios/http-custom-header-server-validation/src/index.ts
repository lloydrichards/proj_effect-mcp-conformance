import { BunHttpServer, BunRuntime } from "@effect/platform-bun";
import { Context, Effect, Layer } from "effect";
import { McpSchema, McpServer } from "effect/unstable/ai";
import { HttpRouter, HttpServer } from "effect/unstable/http";
import { McpServerConfig, server } from "@repo/mcp-fixture";

const CustomHeaderValidationTool = new McpSchema.Tool({
  name: "test_custom_header_validation",
  description: "Exercises an MCP parameter mirrored in an HTTP header.",
  inputSchema: {
    type: "object",
    properties: {
      message: {
        type: "string",
        "x-mcp-header": "message",
      },
    },
    required: ["message"],
  },
});

const customHeaderValidationHandler = (
  arguments_: Readonly<Record<string, unknown>>,
) =>
  Effect.succeed(
    new McpSchema.CallToolResult({
      content: [{ type: "text", text: String(arguments_["message"]) }],
    }),
  );

const CustomHeaderValidationRegistration = Layer.effectDiscard(
  McpServer.McpServer.use((mcp) =>
    mcp.addTool({
      tool: CustomHeaderValidationTool,
      annotations: Context.empty(),
      handle: customHeaderValidationHandler,
    }),
  ),
);

const ScenarioLive = CustomHeaderValidationRegistration.pipe(
  Layer.provideMerge(server("http-custom-header-server-validation")),
);

const MainLive = ScenarioLive.pipe(
  HttpRouter.serve,
  HttpServer.withLogAddress,
  Layer.provide(BunHttpServer.layerConfig(McpServerConfig)),
);

const main = Layer.launch(MainLive).pipe(Effect.satisfiesServicesType<never>());

BunRuntime.runMain(main);
