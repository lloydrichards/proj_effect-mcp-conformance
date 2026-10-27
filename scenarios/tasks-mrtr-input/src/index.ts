import { BunHttpServer, BunRuntime } from "@effect/platform-bun";
import { Effect, Layer, Schema } from "effect";
import { McpSchema, McpTasks, Tool, Toolkit } from "effect/ai";
import { HttpRouter, HttpServer } from "effect/http";
import { McpServerConfig, server } from "@repo/mcp-fixture";

const ConfirmDeleteTool = Tool.make("confirm_delete", {
  description: "Requests confirmation before deleting a file.",
  parameters: Schema.Struct({ filename: Schema.String }),
  success: Schema.String,
});

const Confirmation = Schema.Struct({ confirm: Schema.Boolean });

const MultiInputTool = Tool.make("multi_input", {
  description: "Requests two confirmations concurrently.",
  parameters: Tool.EmptyParams,
  success: Schema.String,
});

const TasksToolkit = Toolkit.make(ConfirmDeleteTool, MultiInputTool);

const TasksHandlers = McpTasks.toolkit(
  TasksToolkit,
  {
    confirm_delete: { mode: "required" },
    multi_input: { mode: "required" },
  },
  {
    confirm_delete: Effect.fnUntraced(function* ({ filename }) {
      const input = yield* McpTasks.Input;
      const response = yield* input
        .elicitation(
          new McpSchema.ElicitRequestFormParams({
            message: `Delete ${filename}?`,
            requestedSchema: {
              type: "object",
              properties: {
                confirm: new McpSchema.ElicitationBoolean({ type: "boolean" }),
              },
              required: ["confirm"],
            },
          }),
          Confirmation,
        )
        .pipe(Effect.orDie);
      return response.action === "accept" && response.content.confirm
        ? `Deleted ${filename}`
        : `Kept ${filename}`;
    }),
    multi_input: Effect.fnUntraced(function* () {
      const input = yield* McpTasks.Input;
      yield* Effect.all(
        ["First confirmation", "Second confirmation"].map((message) =>
          input
            .elicitation(
              new McpSchema.ElicitRequestFormParams({
                message,
                requestedSchema: {
                  type: "object",
                  properties: {
                    confirm: new McpSchema.ElicitationBoolean({
                      type: "boolean",
                    }),
                  },
                  required: ["confirm"],
                },
              }),
              Confirmation,
            )
            .pipe(Effect.orDie),
        ),
        { concurrency: "unbounded" },
      );
      return "Both confirmations received.";
    }),
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
  Layer.provideMerge(server("tasks-mrtr-input")),
);

const MainLive = ScenarioLive.pipe(
  HttpRouter.serve,
  HttpServer.withLogAddress,
  Layer.provide(BunHttpServer.layerConfig(McpServerConfig)),
);

const main = Layer.launch(MainLive).pipe(Effect.satisfiesServicesType<never>());
BunRuntime.runMain(main);
