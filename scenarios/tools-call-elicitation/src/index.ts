import { BunHttpServer, BunRuntime } from "@effect/platform-bun";
import { Context, Effect, Layer, Option, Schema } from "effect";
import { McpSchema, McpServer } from "effect/unstable/ai";
import { HttpRouter, HttpServer } from "effect/unstable/http";
import { McpServerConfig, server } from "@repo/mcp-fixture";

const ElicitationTool = new McpSchema.Tool({
  name: "test_elicitation",
  description: "Requests user input from the client.",
  inputSchema: {
    type: "object",
    properties: { message: { type: "string" } },
    required: ["message"],
  },
});

const handleElicitation = (arguments_: Record<string, unknown>) =>
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
        message: String(arguments_["message"]),
        requestedSchema: {
          type: "object",
          properties: {
            username: { type: "string" },
            email: { type: "string" },
          },
          required: ["username", "email"],
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
            text:
              result.action === "accept"
                ? "Elicitation accepted"
                : "Elicitation not accepted",
          },
        ],
      });
    }),
  );

const ElicitationRegistration = Layer.effectDiscard(
  McpServer.McpServer.use((mcp) =>
    mcp.addTool({
      tool: ElicitationTool,
      annotations: Context.empty(),
      handle: handleElicitation,
    }),
  ),
);

const ScenarioLive = ElicitationRegistration.pipe(
  Layer.provideMerge(server("tools-call-elicitation")),
);

const MainLive = ScenarioLive.pipe(
  HttpRouter.serve,
  HttpServer.withLogAddress,
  Layer.provide(BunHttpServer.layerConfig(McpServerConfig)),
);

const main = Layer.launch(MainLive).pipe(Effect.satisfiesServicesType<never>());

BunRuntime.runMain(main);
