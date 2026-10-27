import { BunHttpServer, BunRuntime } from "@effect/platform-bun";
import { Effect, Layer, Schema } from "effect";
import { McpTasks, Tool, Toolkit } from "effect/ai";
import { HttpRouter, HttpServer } from "effect/http";
import { McpServerConfig, server } from "@repo/mcp-fixture";

const FailingJobTool = Tool.make("failing_job", {
  description: "Returns a tool execution error.",
  parameters: Tool.EmptyParams,
  success: Schema.String,
  failure: Schema.String,
});

const TasksToolkit = Toolkit.make(FailingJobTool);

const TasksHandlers = McpTasks.toolkit(
  TasksToolkit,
  {
    failing_job: { mode: "required" },
  },
  {
    failing_job: () =>
      Effect.sleep("1 second").pipe(
        Effect.andThen(Effect.fail("Expected job failure")),
      ),
  },
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

const ScenarioLive = TasksRegistration.pipe(
  Layer.provideMerge(server("tasks-required-task-error")),
);

const MainLive = ScenarioLive.pipe(
  HttpRouter.serve,
  HttpServer.withLogAddress,
  Layer.provide(BunHttpServer.layerConfig(McpServerConfig)),
);

const main = Layer.launch(MainLive).pipe(Effect.satisfiesServicesType<never>());
BunRuntime.runMain(main);
