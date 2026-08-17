import { BunHttpServer, BunRuntime } from "@effect/platform-bun";
import { Effect, Layer, Schema } from "effect";
import { McpServer, Tool, Toolkit } from "effect/unstable/ai";
import { HttpRouter, HttpServer } from "effect/unstable/http";
import { McpServerConfig, server } from "@repo/mcp-fixture";

const TestTool = Tool.make("test_tool", {
  description: "A minimal tool used to verify MCP tool discovery.",
  // An empty Effect struct emits `{}` as JSON Schema. MCP requires a tool's
  // input schema to explicitly declare itself as an object.
  parameters: Schema.Struct({
    input: Schema.optional(Schema.String),
  }),
  success: Schema.String,
});

const tools = Toolkit.make(TestTool);

const scenario = Layer.effectDiscard(McpServer.registerToolkit(tools)).pipe(
  Layer.provideMerge(server("tools-list")),
  Layer.provide(
    tools.toLayer({
      test_tool: () => Effect.succeed("tool discovery is working"),
    }),
  ),
);

const program = scenario.pipe(
  HttpRouter.serve,
  HttpServer.withLogAddress,
  Layer.provide(BunHttpServer.layerConfig(McpServerConfig)),
  Layer.launch,
  Effect.satisfiesServicesType<never>(),
);

BunRuntime.runMain(program);
