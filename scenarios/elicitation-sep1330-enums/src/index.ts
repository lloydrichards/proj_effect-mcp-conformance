import { BunHttpServer, BunRuntime } from "@effect/platform-bun";
import { Context, Effect, Layer, Option } from "effect";
import { McpSchema, McpServer } from "effect/unstable/ai";
import { HttpRouter, HttpServer } from "effect/unstable/http";
import { McpServerConfig, server } from "@repo/mcp-fixture";

const scenario = Layer.effectDiscard(
  Effect.gen(function* () {
    const mcp = yield* McpServer.McpServer;
    yield* mcp.addTool({
      tool: new McpSchema.Tool({
        name: "test_elicitation_sep1330_enums",
        description: "Requests each supported elicitation enum shape.",
        inputSchema: { type: "object" },
      }),
      annotations: Context.empty(),
      handle: () =>
        Effect.scoped(
          Effect.gen(function* () {
            const serverClient = yield* Effect.serviceOption(
              McpSchema.McpServerClient,
            );
            if (Option.isNone(serverClient)) {
              return yield* new McpSchema.InternalError({
                message: "Elicitation requires an initialized MCP session",
              });
            }
            const client = yield* serverClient.value.getClient;
            const result = yield* client
              .elicit({
                message: "Please choose values for the enum fields.",
                requestedSchema: {
                  type: "object",
                  properties: {
                    untitledSingle: {
                      type: "string",
                      enum: ["option1", "option2", "option3"],
                    },
                    titledSingle: {
                      type: "string",
                      oneOf: [
                        { const: "value1", title: "First Option" },
                        { const: "value2", title: "Second Option" },
                        { const: "value3", title: "Third Option" },
                      ],
                    },
                    legacyEnum: {
                      type: "string",
                      enum: ["opt1", "opt2", "opt3"],
                      enumNames: ["Option One", "Option Two", "Option Three"],
                    },
                    untitledMulti: {
                      type: "array",
                      items: {
                        type: "string",
                        enum: ["option1", "option2", "option3"],
                      },
                    },
                    titledMulti: {
                      type: "array",
                      items: {
                        anyOf: [
                          { const: "value1", title: "First Choice" },
                          { const: "value2", title: "Second Choice" },
                          { const: "value3", title: "Third Choice" },
                        ],
                      },
                    },
                  },
                },
              })
              .pipe(
                Effect.mapError(
                  (error) =>
                    new McpSchema.InternalError({ message: error.operation }),
                ),
              );
            return new McpSchema.CallToolResult({
              content: [
                {
                  type: "text",
                  text: `Elicitation completed: action=${result.action}, content=${JSON.stringify(result.action === "accept" ? result.content : {})}`,
                },
              ],
            });
          }),
        ),
    });
  }),
).pipe(Layer.provideMerge(server("elicitation-sep1330-enums")));

const program = scenario.pipe(
  HttpRouter.serve,
  HttpServer.withLogAddress,
  Layer.provide(BunHttpServer.layerConfig(McpServerConfig)),
  Layer.launch,
  Effect.satisfiesServicesType<never>(),
);

BunRuntime.runMain(program);
