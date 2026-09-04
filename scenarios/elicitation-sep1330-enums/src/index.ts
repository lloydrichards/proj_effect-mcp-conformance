import { BunHttpServer, BunRuntime } from "@effect/platform-bun";
import { Context, Effect, Layer, Option, Schema } from "effect";
import { McpSchema, McpServer } from "effect/unstable/ai";
import { HttpRouter, HttpServer } from "effect/unstable/http";
import { McpServerConfig, server } from "@repo/mcp-fixture";

const Sep1330EnumsTool = new McpSchema.Tool({
  name: "test_elicitation_sep1330_enums",
  description: "Requests each supported elicitation enum shape.",
  inputSchema: { type: "object" },
});

const handleSep1330Enums = () =>
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
      const request = yield* Schema.decodeEffect(
        McpSchema.ElicitRequestFormParams,
      )({
        mode: "form",
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
      }).pipe(Effect.orDie);
      const result = yield* client
        .elicit(request)
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
  );

const Sep1330EnumsRegistration = Layer.effectDiscard(
  McpServer.McpServer.use((mcp) =>
    mcp.addTool({
      tool: Sep1330EnumsTool,
      annotations: Context.empty(),
      handle: handleSep1330Enums,
    }),
  ),
);

const ScenarioLive = Sep1330EnumsRegistration.pipe(
  Layer.provideMerge(server("elicitation-sep1330-enums")),
);

const MainLive = ScenarioLive.pipe(
  HttpRouter.serve,
  HttpServer.withLogAddress,
  Layer.provide(BunHttpServer.layerConfig(McpServerConfig)),
);

const main = Layer.launch(MainLive).pipe(Effect.satisfiesServicesType<never>());

BunRuntime.runMain(main);
