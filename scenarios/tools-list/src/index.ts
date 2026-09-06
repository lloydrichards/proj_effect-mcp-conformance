import { BunHttpServer, BunRuntime } from "@effect/platform-bun";
import { Effect, Layer, Schema } from "effect";
import { McpServer, Tool, Toolkit } from "effect/unstable/ai";
import { HttpRouter, HttpServer } from "effect/unstable/http";
import { McpServerConfig, server } from "@repo/mcp-fixture";

const ToolDiscoveryTool = Tool.make("test_tool", {
  description: "A minimal tool used to verify MCP tool discovery.",
  // An empty Effect struct emits `{}` as JSON Schema. MCP requires a tool's
  // input schema to explicitly declare itself as an object.
  parameters: Schema.Struct({
    input: Schema.optional(Schema.String),
  }),
  success: Schema.String,
});

const ToolDiscoveryToolkit = Toolkit.make(ToolDiscoveryTool);

const ToolDiscoveryHandlers = ToolDiscoveryToolkit.toLayer({
  test_tool: () => Effect.succeed("tool discovery is working"),
});

const ToolDiscoveryFeatures = McpServer.toolkit(ToolDiscoveryToolkit).pipe(
  Layer.provide(ToolDiscoveryHandlers),
);

const ScenarioLive = ToolDiscoveryFeatures.pipe(
  Layer.provideMerge(server("tools-list")),
);

const MainLive = ScenarioLive.pipe(
  HttpRouter.serve,
  HttpServer.withLogAddress,
  Layer.provide(BunHttpServer.layerConfig(McpServerConfig)),
);

const main = Layer.launch(MainLive).pipe(Effect.satisfiesServicesType<never>());

BunRuntime.runMain(main);
