import { BunHttpServer, BunRuntime } from "@effect/platform-bun";
import { Effect, Layer, Schema } from "effect";
import { McpServer, Tool, Toolkit } from "effect/ai";
import { HttpRouter, HttpServer } from "effect/http";
import { McpProtocolConfig, McpServerConfig } from "@repo/mcp-fixture";

const CustomHeaderValidationTool = Tool.dynamic(
  "test_custom_header_validation",
  {
    description: "Exercises an MCP parameter mirrored in an HTTP header.",
    parameters: {
      type: "object",
      properties: {
        message: {
          type: "string",
          "x-mcp-header": "message",
        },
      },
      required: ["message"],
    },
    success: Schema.String,
    failure: Schema.String,
  },
);

const CustomHeaderToolkit = Toolkit.make(CustomHeaderValidationTool);
const MessageArguments = Schema.Struct({ message: Schema.String });

const CustomHeaderHandlers = CustomHeaderToolkit.toLayer({
  test_custom_header_validation: (input) =>
    Schema.decodeUnknownEffect(MessageArguments)(input).pipe(
      Effect.map(({ message }) => message),
      Effect.mapError(() => "Expected a string message."),
    ),
});

const CustomHeaderFeatures = McpServer.toolkit(CustomHeaderToolkit).pipe(
  Layer.provide(CustomHeaderHandlers),
);

const McpHttpLive = Effect.map(
  McpProtocolConfig,
  ({ protocols, allowedOrigins }) =>
    McpServer.layerHttp({
      name: "Effect MCP fixture: http-custom-header-server-validation",
      version: "0.1.0",
      path: "/mcp",
      protocols,
      allowedOrigins,
    }),
).pipe(Layer.unwrap);

const ScenarioLive = CustomHeaderFeatures.pipe(Layer.provideMerge(McpHttpLive));

const MainLive = ScenarioLive.pipe(
  HttpRouter.serve,
  HttpServer.withLogAddress,
  Layer.provide(BunHttpServer.layerConfig(McpServerConfig)),
);

const main = Layer.launch(MainLive).pipe(Effect.satisfiesServicesType<never>());

BunRuntime.runMain(main);
