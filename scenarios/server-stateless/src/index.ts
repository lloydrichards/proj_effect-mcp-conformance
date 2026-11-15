import { BunHttpServer, BunRuntime } from "@effect/platform-bun";
import { Context, Effect, Layer } from "effect";
import { McpSchema, McpServer } from "effect/ai";
import { HttpRouter, HttpServer } from "effect/http";
import { McpProtocolConfig, McpServerConfig } from "@repo/mcp-fixture";

const textResult = (text: string) =>
  new McpSchema.CallToolResult({
    content: [{ type: "text", text }],
  });

const MissingCapabilityTool = new McpSchema.Tool({
  name: "test_missing_capability",
  description: "Requires the client sampling capability.",
  inputSchema: { type: "object" },
});

const StreamingElicitationTool = new McpSchema.Tool({
  name: "test_streaming_elicitation",
  description: "Returns a result over the request response stream.",
  inputSchema: { type: "object" },
});

const LoggingTool = new McpSchema.Tool({
  name: "test_logging_tool",
  description: "Returns without sending a logging notification.",
  inputSchema: { type: "object" },
});

const TriggerToolChangeTool = new McpSchema.Tool({
  name: "test_trigger_tool_change",
  description: "Adds a tool so subscribers receive tools/list_changed.",
  inputSchema: { type: "object" },
});

const DynamicTestTool = new McpSchema.Tool({
  name: "dynamic_test_tool",
  description: "A tool added during the list-change probe.",
  inputSchema: { type: "object" },
});

const missingCapabilityHandler = () =>
  Effect.succeed(
    new McpSchema.InputRequired({
      inputRequests: {
        sampling: {
          method: "sampling/createMessage",
          params: {
            messages: [
              {
                role: "user",
                content: { type: "text", text: "Capability probe" },
              },
            ],
            maxTokens: 1,
          },
        },
      },
    }),
  );

const streamingElicitationHandler = () =>
  Effect.succeed(textResult("Streaming response completed"));

const loggingHandler = () => Effect.succeed(textResult("No log was emitted"));

const dynamicTestHandler = () =>
  Effect.succeed(textResult("Dynamic tool called"));

const ServerStatelessRegistration = Layer.effectDiscard(
  Effect.gen(function* () {
    const mcp = yield* McpServer.McpServer;

    yield* mcp.addTool({
      tool: MissingCapabilityTool,
      annotations: Context.empty(),
      handle: missingCapabilityHandler,
    });

    yield* mcp.addTool({
      tool: StreamingElicitationTool,
      annotations: Context.empty(),
      handle: streamingElicitationHandler,
    });

    yield* mcp.addTool({
      tool: LoggingTool,
      annotations: Context.empty(),
      handle: loggingHandler,
    });

    yield* mcp.addTool({
      tool: TriggerToolChangeTool,
      annotations: Context.empty(),
      handle: () =>
        mcp
          .addTool({
            tool: DynamicTestTool,
            annotations: Context.empty(),
            handle: dynamicTestHandler,
          })
          .pipe(Effect.as(textResult("Tool list changed"))),
    });
  }),
);

const McpHttpLive = Effect.map(
  McpProtocolConfig,
  ({ protocols, allowedOrigins }) =>
    McpServer.layerHttp({
      name: "Effect MCP fixture: server-stateless",
      version: "0.1.0",
      path: "/mcp",
      protocols,
      allowedOrigins,
    }),
).pipe(Layer.unwrap);

const ScenarioLive = ServerStatelessRegistration.pipe(
  Layer.provideMerge(McpHttpLive),
);

const MainLive = ScenarioLive.pipe(
  HttpRouter.serve,
  HttpServer.withLogAddress,
  Layer.provide(BunHttpServer.layerConfig(McpServerConfig)),
);

const main = Layer.launch(MainLive).pipe(Effect.satisfiesServicesType<never>());

BunRuntime.runMain(main);
