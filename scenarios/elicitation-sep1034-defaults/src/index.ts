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
        name: "test_elicitation_sep1034_defaults",
        description:
          "Requests primitive elicitation fields with default values.",
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
                message: "Please provide profile details.",
                requestedSchema: {
                  type: "object",
                  properties: {
                    name: { type: "string", default: "John Doe" },
                    age: { type: "integer", default: 30 },
                    score: { type: "number", default: 95.5 },
                    status: {
                      type: "string",
                      enum: ["active", "inactive", "pending"],
                      default: "active",
                    },
                    verified: { type: "boolean", default: true },
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
).pipe(Layer.provideMerge(server("elicitation-sep1034-defaults")));

const program = scenario.pipe(
  HttpRouter.serve,
  HttpServer.withLogAddress,
  Layer.provide(BunHttpServer.layerConfig(McpServerConfig)),
  Layer.launch,
  Effect.satisfiesServicesType<never>(),
);

BunRuntime.runMain(program);
