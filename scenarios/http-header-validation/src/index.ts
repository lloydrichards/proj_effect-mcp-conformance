import { BunHttpServer, BunRuntime } from "@effect/platform-bun";
import { Context, Effect, Layer } from "effect";
import { McpSchema, McpServer } from "effect/unstable/ai";
import { HttpRouter, HttpServer } from "effect/unstable/http";
import { McpServerConfig, server } from "@repo/mcp-fixture";

const HeaderValidationTool = new McpSchema.Tool({
  name: "test_header_validation",
  description: "Exercises standard MCP routing headers.",
  inputSchema: { type: "object" },
});

const headerValidationHandler = () =>
  Effect.succeed(
    new McpSchema.CallToolResult({
      content: [{ type: "text", text: "Headers accepted" }],
    }),
  );

const HeaderValidationRegistration = Layer.effectDiscard(
  McpServer.McpServer.use((mcp) =>
    mcp.addTool({
      tool: HeaderValidationTool,
      annotations: Context.empty(),
      handle: headerValidationHandler,
    }),
  ),
);

const ScenarioLive = HeaderValidationRegistration.pipe(
  Layer.provideMerge(server("http-header-validation")),
);

const MainLive = ScenarioLive.pipe(
  HttpRouter.serve,
  HttpServer.withLogAddress,
  Layer.provide(BunHttpServer.layerConfig(McpServerConfig)),
);

const main = Layer.launch(MainLive).pipe(Effect.satisfiesServicesType<never>());

BunRuntime.runMain(main);
