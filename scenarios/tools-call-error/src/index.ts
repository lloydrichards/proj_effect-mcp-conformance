import { BunHttpServer, BunRuntime } from "@effect/platform-bun";
import { Effect, Layer, Schema } from "effect";
import { McpServer, Tool, Toolkit } from "effect/ai";
import { HttpRouter, HttpServer } from "effect/http";
import { McpProtocolConfig, McpServerConfig } from "@repo/mcp-fixture";

class ExpectedToolError extends Schema.TaggedError<ExpectedToolError>()(
  "ExpectedToolError",
  {
    message: Schema.String,
  },
) {}

const ErrorHandlingTool = Tool.make("test_error_handling", {
  description: "Returns an expected tool error.",
  parameters: Tool.EmptyParams,
  success: Schema.String,
  failure: ExpectedToolError,
});

const ErrorToolkit = Toolkit.make(ErrorHandlingTool);
const ErrorHandlers = ErrorToolkit.toLayer({
  test_error_handling: () =>
    Effect.fail(
      new ExpectedToolError({
        message: "This tool intentionally returns an error for testing",
      }),
    ),
});

const ErrorHandlingFeatures = McpServer.toolkit(ErrorToolkit).pipe(
  Layer.provide(ErrorHandlers),
);

const McpHttpLive = Effect.map(
  McpProtocolConfig,
  ({ protocols, allowedOrigins }) =>
    McpServer.layerHttp({
      name: "Effect MCP fixture: tools-call-error",
      version: "0.1.0",
      path: "/mcp",
      protocols,
      allowedOrigins,
    }),
).pipe(Layer.unwrap);

const ScenarioLive = ErrorHandlingFeatures.pipe(
  Layer.provideMerge(McpHttpLive),
);

const MainLive = ScenarioLive.pipe(
  HttpRouter.serve,
  HttpServer.withLogAddress,
  Layer.provide(BunHttpServer.layerConfig(McpServerConfig)),
);

const main = Layer.launch(MainLive).pipe(Effect.satisfiesServicesType<never>());

BunRuntime.runMain(main);
