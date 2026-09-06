import { BunHttpServer, BunRuntime } from "@effect/platform-bun";
import { Context, Effect, Layer } from "effect";
import { McpSchema, McpServer } from "effect/unstable/ai";
import { HttpRouter, HttpServer } from "effect/unstable/http";
import { McpServerConfig, server } from "@repo/mcp-fixture";

const ErrorHandlingTool = new McpSchema.Tool({
  name: "test_error_handling",
  description: "Returns an expected tool error.",
  inputSchema: { type: "object" },
});

const errorHandlingHandler = () =>
  Effect.succeed(
    new McpSchema.CallToolResult({
      isError: true,
      content: [
        {
          type: "text",
          text: "This tool intentionally returns an error for testing",
        },
      ],
    }),
  );

const ErrorHandlingRegistration = Layer.effectDiscard(
  McpServer.McpServer.use((mcp) =>
    mcp.addTool({
      tool: ErrorHandlingTool,
      annotations: Context.empty(),
      handle: errorHandlingHandler,
    }),
  ),
);

const ScenarioLive = ErrorHandlingRegistration.pipe(
  Layer.provideMerge(server("tools-call-error")),
);

const MainLive = ScenarioLive.pipe(
  HttpRouter.serve,
  HttpServer.withLogAddress,
  Layer.provide(BunHttpServer.layerConfig(McpServerConfig)),
);

const main = Layer.launch(MainLive).pipe(Effect.satisfiesServicesType<never>());

BunRuntime.runMain(main);
