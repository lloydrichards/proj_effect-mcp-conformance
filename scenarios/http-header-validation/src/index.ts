import { BunHttpServer, BunRuntime } from "@effect/platform-bun";
import { Effect, Layer, Schema } from "effect";
import { McpServer, Tool, Toolkit } from "effect/ai";
import { HttpRouter, HttpServer } from "effect/http";
import { McpProtocolConfig, McpServerConfig } from "@repo/mcp-fixture";

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

const McpHttpLive = Effect.map(
  McpProtocolConfig,
  ({ protocols, allowedOrigins }) =>
    McpServer.layerHttp({
      name: "Effect MCP fixture: http-header-validation",
      version: "0.1.0",
      path: "/mcp",
      protocols,
      allowedOrigins,
    }),
).pipe(Layer.unwrap);

const ScenarioLive = HeaderValidationFeatures.pipe(
  Layer.provideMerge(McpHttpLive),
);

const MainLive = ScenarioLive.pipe(
  HttpRouter.serve,
  HttpServer.withLogAddress,
  Layer.provide(BunHttpServer.layerConfig(McpServerConfig)),
);

const main = Layer.launch(MainLive).pipe(Effect.satisfiesServicesType<never>());

BunRuntime.runMain(main);
