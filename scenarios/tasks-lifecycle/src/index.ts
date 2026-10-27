import { BunHttpServer, BunRuntime } from "@effect/platform-bun";
import { Context, Effect, Layer, Schema } from "effect";
import { McpSchema, McpServer, McpTasks, Tool, Toolkit } from "effect/ai";
import { HttpRouter, HttpServer } from "effect/http";
import { McpServerConfig, server } from "@repo/mcp-fixture";

const GreetTool = new McpSchema.Tool({
  name: "greet",
  description: "Returns the exact unquoted greeting required by the checker.",
  inputSchema: {
    type: "object",
    properties: { name: { type: "string" } },
    required: ["name"],
  },
});

const SlowComputeTool = Tool.make("slow_compute", {
  description: "Completes after the requested number of seconds.",
  parameters: Schema.Struct({ seconds: Schema.Finite, label: Schema.String }),
  success: Schema.String,
});

const FailingJobTool = Tool.make("failing_job", {
  description: "Returns a tool execution error.",
  parameters: Tool.EmptyParams,
  success: Schema.String,
  failure: Schema.String,
});

const ProtocolErrorJobTool = Tool.make("protocol_error_job", {
  description: "Fails with a protocol error when task execution times out.",
  parameters: Tool.EmptyParams,
  success: Schema.String,
});

const TasksToolkit = Toolkit.make(
  SlowComputeTool,
  FailingJobTool,
  ProtocolErrorJobTool,
);

const TasksHandlers = McpTasks.toolkit(
  TasksToolkit,
  {
    slow_compute: { mode: "optional", whenUnavailable: "inline" },
    failing_job: { mode: "required" },
    protocol_error_job: { mode: "required", timeout: "40 millis" },
  },
  {
    slow_compute: ({ seconds, label }) =>
      Effect.sleep(`${seconds} seconds`).pipe(Effect.as(`Computed ${label}`)),
    failing_job: () =>
      Effect.sleep("1 second").pipe(
        Effect.andThen(Effect.fail("Expected job failure")),
      ),
    protocol_error_job: () => Effect.never,
  },
);

const GreetRegistration = Layer.effectDiscard(
  McpServer.McpServer.use((mcp) =>
    mcp.addTool({
      tool: GreetTool,
      annotations: Context.empty(),
      handle: (payload) =>
        Schema.decodeUnknownEffect(Schema.Struct({ name: Schema.String }))(
          payload,
        ).pipe(
          Effect.orDie,
          Effect.map(
            ({ name }) =>
              new McpSchema.CallToolResult({
                content: [{ type: "text", text: `Hello, ${name}!` }],
              }),
          ),
        ),
    }),
  ),
);

const TasksRegistration = TasksHandlers.pipe(
  McpTasks.toLayer,
  Layer.provide(
    McpTasks.layerMemory({
      maxActive: 16,
      maxRecords: 100,
      owner: "shared",
      retention: "5 minutes",
      timeout: "2 minutes",
      pollInterval: "50 millis",
    }),
  ),
);

const ScenarioLive = Layer.mergeAll(GreetRegistration, TasksRegistration).pipe(
  Layer.provideMerge(server("tasks-lifecycle")),
);

const MainLive = ScenarioLive.pipe(
  HttpRouter.serve,
  HttpServer.withLogAddress,
  Layer.provide(BunHttpServer.layerConfig(McpServerConfig)),
);

const main = Layer.launch(MainLive).pipe(Effect.satisfiesServicesType<never>());
BunRuntime.runMain(main);
