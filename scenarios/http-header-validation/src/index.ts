import { BunHttpServer, BunRuntime } from "@effect/platform-bun";
import { Effect, Layer, Schema } from "effect";
import { McpServer, Tool, Toolkit } from "effect/ai";
import { HttpRouter, HttpServer } from "effect/http";
import { McpServerConfig, server } from "@repo/mcp-fixture";

const HeaderValidationTool = Tool.make("test_header_validation", {
  description: "Exercises standard MCP routing headers.",
  parameters: Tool.EmptyParams,
  success: Schema.String,
});

const HeaderToolkit = Toolkit.make(HeaderValidationTool);

const HeaderHandlers = HeaderToolkit.toLayer({
  test_header_validation: () => Effect.succeed("Headers accepted"),
});

const HeaderValidationFeatures = McpServer.toolkit(HeaderToolkit).pipe(
  Layer.provide(HeaderHandlers),
);

const ScenarioLive = HeaderValidationFeatures.pipe(
  Layer.provideMerge(server("http-header-validation")),
);

const MainLive = ScenarioLive.pipe(
  HttpRouter.serve,
  HttpServer.withLogAddress,
  Layer.provide(BunHttpServer.layerConfig(McpServerConfig)),
);

const main = Layer.launch(MainLive).pipe(Effect.satisfiesServicesType<never>());

BunRuntime.runMain(main);
