import { BunHttpServer, BunRuntime } from "@effect/platform-bun";
import { Effect, Layer, Schema } from "effect";
import { McpServer, Tool, Toolkit } from "effect/ai";
import { HttpRouter, HttpServer } from "effect/http";
import { McpServerConfig, server } from "@repo/mcp-fixture";

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

const ScenarioLive = ErrorHandlingFeatures.pipe(
  Layer.provideMerge(server("tools-call-error")),
);

const MainLive = ScenarioLive.pipe(
  HttpRouter.serve,
  HttpServer.withLogAddress,
  Layer.provide(BunHttpServer.layerConfig(McpServerConfig)),
);

const main = Layer.launch(MainLive).pipe(Effect.satisfiesServicesType<never>());

BunRuntime.runMain(main);
